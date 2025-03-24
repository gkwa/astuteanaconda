import { DynamoDBClient } from "./aws-dynamodb.js"

document.addEventListener("DOMContentLoaded", function () {
  const extractBtn = document.getElementById("extractBtn")
  const sendToDynamoBtn = document.getElementById("sendToDynamoBtn")
  const configBtn = document.getElementById("configBtn")
  const saveConfigBtn = document.getElementById("saveConfigBtn")
  const configSection = document.getElementById("configSection")
  const statusEl = document.getElementById("status")

  let extractedProducts = []
  let dynamoDBClient = new DynamoDBClient()

  // Load saved AWS credentials
  chrome.storage.local.get(["awsAccessKeyId", "awsSecretAccessKey"], function (result) {
    if (result.awsAccessKeyId && result.awsSecretAccessKey) {
      document.getElementById("awsAccessKeyId").value = result.awsAccessKeyId
      document.getElementById("awsSecretAccessKey").value = result.awsSecretAccessKey

      // Set environment variables
      process.env = process.env || {}
      process.env.AWS_ACCESS_KEY_ID = result.awsAccessKeyId
      process.env.AWS_SECRET_ACCESS_KEY = result.awsSecretAccessKey
    }
  })

  // Extract products button
  extractBtn.addEventListener("click", async function () {
    showStatus("Extracting products...", "loading")
    extractBtn.disabled = true

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        function: extractProducts,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          showStatus(`Error: ${chrome.runtime.lastError.message}`, "error")
          extractBtn.disabled = false
          return
        }

        const result = results[0].result
        if (result && Array.isArray(result) && result.length > 0) {
          extractedProducts = result
          showStatus(`Found ${result.length} products! Ready to send to DynamoDB.`, "success")
          sendToDynamoBtn.disabled = false
        } else {
          showStatus("No products found or invalid data returned.", "error")
        }

        extractBtn.disabled = false
      },
    )
  })

  // Send to DynamoDB button
  sendToDynamoBtn.addEventListener("click", async function () {
    if (!extractedProducts || extractedProducts.length === 0) {
      showStatus("No products to send. Please extract products first.", "error")
      return
    }

    // Check if AWS credentials are configured
    chrome.storage.local.get(["awsAccessKeyId", "awsSecretAccessKey"], async function (result) {
      if (!result.awsAccessKeyId || !result.awsSecretAccessKey) {
        showStatus("AWS credentials not configured. Please configure them first.", "error")
        configSection.classList.remove("hidden")
        return
      }

      // Set environment variables
      process.env = process.env || {}
      process.env.AWS_ACCESS_KEY_ID = result.awsAccessKeyId
      process.env.AWS_SECRET_ACCESS_KEY = result.awsSecretAccessKey

      sendToDynamoBtn.disabled = true
      showStatus("Sending products to DynamoDB...", "loading")

      try {
        const response = await dynamoDBClient.sendProducts(extractedProducts)

        if (response.success) {
          showStatus(response.message, "success")
        } else {
          showStatus(`Error: ${response.message}`, "error")
        }
      } catch (error) {
        showStatus(`Error: ${error.message}`, "error")
      } finally {
        sendToDynamoBtn.disabled = false
      }
    })
  })

  // Configure AWS button
  configBtn.addEventListener("click", function () {
    configSection.classList.toggle("hidden")
  })

  // Save configuration button
  saveConfigBtn.addEventListener("click", function () {
    const awsAccessKeyId = document.getElementById("awsAccessKeyId").value.trim()
    const awsSecretAccessKey = document.getElementById("awsSecretAccessKey").value.trim()

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      showStatus("Please enter both AWS Access Key ID and Secret Access Key", "error")
      return
    }

    // Save to chrome.storage
    chrome.storage.local.set(
      {
        awsAccessKeyId: awsAccessKeyId,
        awsSecretAccessKey: awsSecretAccessKey,
      },
      function () {
        showStatus("AWS credentials saved successfully!", "success")

        // Set environment variables
        process.env = process.env || {}
        process.env.AWS_ACCESS_KEY_ID = awsAccessKeyId
        process.env.AWS_SECRET_ACCESS_KEY = awsSecretAccessKey

        configSection.classList.add("hidden")
      },
    )
  })

  // Helper function to show status messages
  function showStatus(message, type) {
    statusEl.textContent = message
    statusEl.className = `status ${type}`
    statusEl.classList.remove("hidden")
  }
})

// Function to extract products from the page
function extractProducts() {
  console.log("DEBUGGING: Extract button clicked, checking for SocialSparrow...")

  // First check if we have intercepted data
  if (window._interceptedProductData) {
    console.log("DEBUGGING: Using intercepted product data")
    return processProducts(window._interceptedProductData)
  }

  // Check if SocialSparrow is available
  if (typeof window.SocialSparrow === "undefined") {
    console.error("SocialSparrow is not available on this page.")
    // Try DOM-based extraction as fallback
    const domProducts = extractProductsFromDOM()
    if (domProducts && domProducts.length > 0) {
      return domProducts
    } else {
      console.error("SocialSparrow API not available and couldn't extract products from DOM.")
      return []
    }
  }

  try {
    // Check if extractProducts method exists
    if (typeof window.SocialSparrow.extractProducts !== "function") {
      console.error("SocialSparrow.extractProducts is not a function")
      // Try direct access to data if available
      if (window._socialsparrow && window._socialsparrow.products) {
        console.log("DEBUGGING: Found products directly in _socialsparrow")
        return window._socialsparrow.products
      }
      return []
    }

    console.log("DEBUGGING: Calling SocialSparrow.extractProducts()")
    // Extract products using SocialSparrow API
    const products = window.SocialSparrow.extractProducts()
    console.log("DEBUGGING: extractProducts() returned:", products)

    // Check if products is undefined or null
    if (products === undefined || products === null) {
      console.error("SocialSparrow.extractProducts() returned undefined or null")
      // Try DOM-based extraction as fallback
      const domProducts = extractProductsFromDOM()
      if (domProducts && domProducts.length > 0) {
        return domProducts
      } else {
        console.error("SocialSparrow returned no data and couldn't extract products from DOM.")
        return []
      }
    }

    return processProducts(products)
  } catch (error) {
    console.error("Error extracting products:", error)
    return []
  }
}

// Process products into a standard format
function processProducts(productsData) {
  // Handle different product formats
  let processedProducts = productsData

  // Handle object vs array
  if (typeof processedProducts === "object" && !Array.isArray(processedProducts)) {
    if (processedProducts.products && Array.isArray(processedProducts.products)) {
      processedProducts = processedProducts.products
    } else if (processedProducts.items && Array.isArray(processedProducts.items)) {
      processedProducts = processedProducts.items
    } else {
      processedProducts = [processedProducts]
    }
  }

  // Log products directly
  console.log("Products from SocialSparrow API:")
  console.table(processedProducts)
  console.log(
    `Total products found: ${Array.isArray(processedProducts) ? processedProducts.length : "unknown"}`,
  )

  return processedProducts
}

// Function to extract products from DOM as a fallback
function extractProductsFromDOM() {
  console.log("DEBUGGING: Attempting to extract products from DOM elements")
  const products = []

  try {
    // Look for common product grid containers
    const productContainers = document.querySelectorAll(
      '.product-grid, .products-grid, [data-test="product-grid"], [data-test="search-results"]',
    )

    if (productContainers.length === 0) {
      console.log("DEBUGGING: No product containers found in DOM")
      return []
    }

    // For each container, find product elements
    productContainers.forEach((container) => {
      const productElements = container.querySelectorAll(
        '.product, .product-card, [data-test="product-card"]',
      )

      console.log(`DEBUGGING: Found ${productElements.length} product elements in container`)

      productElements.forEach((productEl) => {
        try {
          // Extract product details
          const titleEl = productEl.querySelector(
            '.product-title, .product-name, [data-test="product-title"]',
          )
          const priceEl = productEl.querySelector('.product-price, [data-test="product-price"]')
          const imageEl = productEl.querySelector("img")

          const product = {
            name: titleEl ? titleEl.textContent.trim() : "",
            price: priceEl ? priceEl.textContent.trim() : "",
            imageUrl: imageEl ? imageEl.src : "",
            url: productEl.querySelector("a") ? productEl.querySelector("a").href : "",
            timestamp: new Date().toISOString(),
          }

          // Only add if we have at least a name
          if (product.name) {
            products.push(product)
          }
        } catch (err) {
          console.log("DEBUGGING: Error extracting individual product:", err)
        }
      })
    })

    return products
  } catch (error) {
    console.error("DEBUGGING: Error in DOM extraction:", error)
    return []
  }
}
