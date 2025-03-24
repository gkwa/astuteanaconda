document.addEventListener("DOMContentLoaded", function () {
  const extractBtn = document.getElementById("extractBtn")
  const sendToDynamoBtn = document.getElementById("sendToDynamoBtn")
  const configBtn = document.getElementById("configBtn")
  const saveConfigBtn = document.getElementById("saveConfigBtn")
  const configSection = document.getElementById("configSection")
  const statusEl = document.getElementById("status")

  // Check if AWS credentials are configured
  chrome.runtime.sendMessage({ type: "GET_AWS_CREDENTIALS_STATUS" }, (response) => {
    if (response && response.configured) {
      showStatus(
        "AWS credentials configured. Products will be automatically sent to DynamoDB.",
        "success",
      )
    } else {
      showStatus(
        "Please configure your AWS credentials to enable automatic DynamoDB updates.",
        "error",
      )
      configSection.classList.remove("hidden")
    }
  })

  // Load saved AWS credentials
  chrome.storage.local.get(["awsAccessKeyId", "awsSecretAccessKey"], function (result) {
    if (result.awsAccessKeyId && result.awsSecretAccessKey) {
      document.getElementById("awsAccessKeyId").value = result.awsAccessKeyId
      document.getElementById("awsSecretAccessKey").value = result.awsSecretAccessKey
    }
  })

  // Extract products button - manual trigger
  extractBtn.addEventListener("click", async function () {
    showStatus("Extracting products...", "loading")

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        function: triggerExtraction,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          showStatus(`Error: ${chrome.runtime.lastError.message}`, "error")
          return
        }

        showStatus("Products extraction triggered. Check console for details.", "success")
      },
    )
  })

  // Send to DynamoDB button - manual trigger
  sendToDynamoBtn.addEventListener("click", async function () {
    showStatus("Triggering DynamoDB upload...", "loading")

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        function: triggerDynamoDBUpload,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          showStatus(`Error: ${chrome.runtime.lastError.message}`, "error")
          return
        }

        showStatus("DynamoDB upload triggered. Check console for details.", "success")
      },
    )
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

    // Send message to background script to save credentials
    chrome.runtime.sendMessage(
      {
        type: "SAVE_AWS_CREDENTIALS",
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
      function (response) {
        if (response && response.success) {
          showStatus(
            "AWS credentials saved successfully! Products will now be automatically sent to DynamoDB.",
            "success",
          )
          configSection.classList.add("hidden")
        } else {
          showStatus("Failed to save credentials. Please try again.", "error")
        }
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

// Function to manually trigger extraction from the page
function triggerExtraction() {
  console.log("DEBUGGING: Manually triggering product extraction")

  // Check if SocialSparrow is available
  if (typeof window.SocialSparrow === "undefined") {
    console.error("SocialSparrow is not available on this page.")
    return { success: false, message: "SocialSparrow API not available" }
  }

  try {
    if (typeof window.SocialSparrow.extractProducts === "function") {
      const products = window.SocialSparrow.extractProducts()

      // Check if we got valid products
      if (
        products &&
        (Array.isArray(products) ||
          (typeof products === "object" && (products.products || products.items)))
      ) {
        console.log("DEBUGGING: Products extracted successfully")

        // Process products and send them to background script
        let productArray = Array.isArray(products)
          ? products
          : products.products || products.items || []

        if (productArray.length > 0) {
          // Send products to background for DynamoDB processing
          chrome.runtime.sendMessage({
            type: "PRODUCTS_EXTRACTED",
            products: productArray,
          })

          return {
            success: true,
            message: `Successfully extracted ${productArray.length} products`,
          }
        }
      }
    }

    return { success: false, message: "Failed to extract products" }
  } catch (error) {
    console.error("Error extracting products:", error)
    return { success: false, message: `Error: ${error.message}` }
  }
}

// Function to manually trigger DynamoDB upload for any cached products
function triggerDynamoDBUpload() {
  console.log("DEBUGGING: Manually triggering DynamoDB upload")

  // Try different sources of product data
  let products = null

  if (window._socialsparrow && window._socialsparrow.products) {
    products = window._socialsparrow.products
  } else if (window._interceptedProductData) {
    const data = window._interceptedProductData
    products = data.products || data.items
  } else if (window._interceptedXHRData) {
    const data = window._interceptedXHRData
    products = data.products || data.items
  } else if (
    typeof window.SocialSparrow !== "undefined" &&
    typeof window.SocialSparrow.extractProducts === "function"
  ) {
    try {
      const extractedData = window.SocialSparrow.extractProducts()
      products = Array.isArray(extractedData)
        ? extractedData
        : extractedData.products || extractedData.items
    } catch (error) {
      console.error("Error extracting products:", error)
    }
  }

  if (products && Array.isArray(products) && products.length > 0) {
    // Send products to background for DynamoDB processing
    chrome.runtime.sendMessage({
      type: "PRODUCTS_EXTRACTED",
      products: products,
    })

    return {
      success: true,
      message: `Sending ${products.length} products to DynamoDB`,
    }
  }

  return {
    success: false,
    message: "No products found to send to DynamoDB",
  }
}
