import { saveAWSCredentials } from "./aws-credentials.js"
import { saveProductsToDynamoDB, testAWSConnectivity } from "./api.js"

document.addEventListener("DOMContentLoaded", function () {
  const extractBtn = document.getElementById("extractBtn")
  const saveToDynamoBtn = document.getElementById("saveToDynamoBtn")
  const saveCredentialsBtn = document.getElementById("saveCredentialsBtn")
  const testConnectionBtn = document.getElementById("testConnectionBtn")
  const accessKeyIdInput = document.getElementById("accessKeyId")
  const secretAccessKeyInput = document.getElementById("secretAccessKey")
  const statusMessage = document.getElementById("statusMessage")

  // Load saved credentials if available
  loadSavedCredentials()

  // Extract products button
  extractBtn.addEventListener("click", async function () {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractProducts,
    })
  })

  // Save to DynamoDB button
  saveToDynamoBtn.addEventListener("click", async function () {
    showStatus("Extracting and saving products to DynamoDB...", "")

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        function: extractAndSaveProductsToDynamoDB,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          showStatus("Error: " + chrome.runtime.lastError.message, "error")
          return
        }

        if (results && results[0] && results[0].result) {
          const result = results[0].result
          if (result.success) {
            showStatus(`Successfully saved ${result.count || 0} products to DynamoDB!`, "success")
          } else {
            showStatus(`Error: ${result.error || "Unknown error"}`, "error")
          }
        } else {
          showStatus("Error: No results returned from script execution", "error")
        }
      },
    )
  })

  // Save credentials button
  saveCredentialsBtn.addEventListener("click", function () {
    const accessKeyId = accessKeyIdInput.value.trim()
    const secretAccessKey = secretAccessKeyInput.value.trim()

    if (!accessKeyId || !secretAccessKey) {
      showStatus("Please enter both AWS Access Key ID and Secret Access Key", "error")
      return
    }

    saveAWSCredentials(accessKeyId, secretAccessKey)
      .then(() => {
        showStatus("AWS credentials saved successfully!", "success")
      })
      .catch((error) => {
        showStatus(`Error saving credentials: ${error.message}`, "error")
      })
  })

  // Test connection button
  testConnectionBtn.addEventListener("click", async function () {
    showStatus("Testing AWS DynamoDB connection...", "")

    // First save credentials if they've been entered
    const accessKeyId = accessKeyIdInput.value.trim()
    const secretAccessKey = secretAccessKeyInput.value.trim()

    if (accessKeyId && secretAccessKey) {
      try {
        await saveAWSCredentials(accessKeyId, secretAccessKey)
      } catch (error) {
        showStatus(`Error saving credentials: ${error.message}`, "error")
        return
      }
    }

    // Test the connection
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        function: testAWSConnection,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          showStatus("Error: " + chrome.runtime.lastError.message, "error")
          return
        }

        if (results && results[0] && results[0].result) {
          const result = results[0].result
          if (result.success) {
            showStatus("AWS DynamoDB connection successful!", "success")
          } else {
            showStatus(
              `AWS DynamoDB connection failed: ${result.error || "Unknown error"}`,
              "error",
            )
          }
        } else {
          showStatus("Error: No results returned from script execution", "error")
        }
      },
    )
  })

  // Load saved credentials from storage
  function loadSavedCredentials() {
    chrome.storage.local.get(["aws_access_key_id", "aws_secret_access_key"], function (result) {
      if (result.aws_access_key_id) {
        accessKeyIdInput.value = result.aws_access_key_id
      }
      if (result.aws_secret_access_key) {
        secretAccessKeyInput.value = result.aws_secret_access_key
      }
    })
  }

  // Show status message
  function showStatus(message, type) {
    statusMessage.textContent = message
    statusMessage.className = type ? `status ${type}` : "status"
    statusMessage.style.display = "block"

    // Hide success messages after 5 seconds
    if (type === "success") {
      setTimeout(() => {
        statusMessage.style.display = "none"
      }, 5000)
    }
  }
})

// Function to extract products (executed in page context)
function extractProducts() {
  console.log("DEBUGGING: Extract button clicked, checking for SocialSparrow...")

  // First check if we have intercepted data
  if (window._interceptedProductData) {
    console.log("DEBUGGING: Using intercepted product data")
    const products = processProductData(window._interceptedProductData)
    displayProducts(products)
    return
  }

  // Check if SocialSparrow is available
  if (typeof window.SocialSparrow === "undefined") {
    console.error("SocialSparrow is not available on this page.")
    // Try DOM-based extraction as fallback
    const domProducts = extractProductsFromDOM()
    if (domProducts && domProducts.length > 0) {
      displayProducts(domProducts)
    } else {
      alert("SocialSparrow API not available and couldn't extract products from DOM.")
    }
    return
  }

  try {
    // Check if extractProducts method exists
    if (typeof window.SocialSparrow.extractProducts !== "function") {
      console.error("SocialSparrow.extractProducts is not a function")
      // Try direct access to data if available
      if (window._socialsparrow && window._socialsparrow.products) {
        console.log("DEBUGGING: Found products directly in _socialsparrow")
        displayProducts(window._socialsparrow.products)
        return
      }
      return
    }

    console.log("DEBUGGING: Calling SocialSparrow.extractProducts()")
    // Extract products using SocialSparrow API
    const rawProducts = window.SocialSparrow.extractProducts()
    console.log("DEBUGGING: extractProducts() returned:", rawProducts)

    // Print full JSON for debugging
    console.log("DEBUGGING: Full product JSON:", JSON.stringify(rawProducts, null, 2))

    // Check if products is undefined or null
    if (rawProducts === undefined || rawProducts === null) {
      console.error("SocialSparrow.extractProducts() returned undefined or null")
      // Try DOM-based extraction as fallback
      const domProducts = extractProductsFromDOM()
      if (domProducts && domProducts.length > 0) {
        displayProducts(domProducts)
      } else {
        alert("SocialSparrow returned no data and couldn't extract products from DOM.")
      }
      return
    }

    // Process and display products
    const products = processProductData(rawProducts)
    displayProducts(products)
  } catch (error) {
    console.error("Error extracting products:", error)
    alert("Error extracting products. Check the console for details.")
  }
}

// Function to extract and save products to DynamoDB (executed in page context)
async function extractAndSaveProductsToDynamoDB() {
  console.log("DEBUGGING: Extract and save to DynamoDB button clicked")

  // Get products using the existing extraction methods
  let products = []

  // Try different sources for product data
  // First, try intercepted data
  if (window._interceptedProductData) {
    console.log("DEBUGGING: Using intercepted product data for DynamoDB save")
    products = processProductData(window._interceptedProductData)
  }
  // Then try SocialSparrow API
  else if (
    typeof window.SocialSparrow !== "undefined" &&
    typeof window.SocialSparrow.extractProducts === "function"
  ) {
    console.log("DEBUGGING: Using SocialSparrow API for DynamoDB save")
    const extractedProducts = window.SocialSparrow.extractProducts()
    products = processProductData(extractedProducts)
  }
  // Finally try DOM extraction
  else {
    console.log("DEBUGGING: Using DOM extraction for DynamoDB save")
    products = extractProductsFromDOM()
  }

  // Check if we got products
  if (!products || products.length === 0) {
    console.error("DEBUGGING: No products found to save to DynamoDB")
    return { success: false, error: "No products found to save" }
  }

  console.log(`DEBUGGING: Preparing to save ${products.length} products to DynamoDB`)

  // Save to DynamoDB if we have the function available
  if (typeof window.saveToDynamoDB === "function") {
    try {
      const result = await window.saveToDynamoDB(products)
      console.log("DEBUGGING: Products saved to DynamoDB:", result)
      return { success: true, count: products.length }
    } catch (error) {
      console.error("DEBUGGING: Error saving products to DynamoDB:", error)
      return { success: false, error: error.message }
    }
  } else {
    console.error("DEBUGGING: saveToDynamoDB function not available")
    return { success: false, error: "DynamoDB save function not available" }
  }
}

// Test AWS connection (executed in page context)
async function testAWSConnection() {
  if (typeof window.testAWSConnectivity === "function") {
    try {
      const result = await window.testAWSConnectivity()
      console.log("DEBUGGING: AWS connection test result:", result)
      return result
    } catch (error) {
      console.error("DEBUGGING: AWS connection test error:", error)
      return { success: false, error: error.message }
    }
  } else {
    console.error("DEBUGGING: testAWSConnectivity function not available")
    return { success: false, error: "AWS test function not available" }
  }
}

// Process product data from various formats into a uniform array
function processProductData(data) {
  if (!data) return []

  // Handle different product formats
  let processedProducts = data

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

  return processedProducts
}

function displayProducts(products) {
  // Log products directly
  console.log("Products extracted:")
  console.table(products)
  console.log(`Total products found: ${Array.isArray(products) ? products.length : "unknown"}`)

  // Display a notification to the user
  if (Array.isArray(products) && products.length > 0) {
    alert(`Successfully found ${products.length} products! Check the console for details.`)
  } else {
    alert("Product data retrieved but format is unexpected. Check the console for details.")
  }

  // Try to copy to clipboard
  try {
    const jsonStr = JSON.stringify(products, null, 2)
    navigator.clipboard
      .writeText(jsonStr)
      .then(() => console.log("Products copied to clipboard"))
      .catch((err) => console.error("Error copying to clipboard:", err))
  } catch (e) {
    console.error("Error in clipboard copy:", e)
  }
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
