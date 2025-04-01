import { saveAWSCredentials } from "./aws-credentials.js"
import { testAWSConnectivity } from "./api.js"
import { debug, error } from "./utils/logger.js"

document.addEventListener("DOMContentLoaded", function () {
  const accessKeyIdInput = document.getElementById("accessKeyId")
  const secretAccessKeyInput = document.getElementById("secretAccessKey")
  const extractBtn = document.getElementById("extractBtn")
  const saveToDynamoBtn = document.getElementById("saveToDynamoBtn")
  const saveCredentialsBtn = document.getElementById("saveCredentialsBtn")
  const testConnectionBtn = document.getElementById("testConnectionBtn")
  const statusMessage = document.getElementById("statusMessage")

  // Load saved credentials if they exist
  chrome.storage.local.get(["aws_access_key_id", "aws_secret_access_key"], function (result) {
    if (result.aws_access_key_id) {
      accessKeyIdInput.value = result.aws_access_key_id
    }
    if (result.aws_secret_access_key) {
      secretAccessKeyInput.value = result.aws_secret_access_key
    }
  })

  // Extract Products button
  extractBtn.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: extractProductsOnly,
      })
    })
  })

  // Extract & Save to DynamoDB button
  saveToDynamoBtn.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: extractAndSaveProducts,
      })
    })
  })

  // Save AWS Credentials button
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

  // Test Connection button
  testConnectionBtn.addEventListener("click", function () {
    const accessKeyId = accessKeyIdInput.value.trim()
    const secretAccessKey = secretAccessKeyInput.value.trim()

    if (accessKeyId && secretAccessKey) {
      saveAWSCredentials(accessKeyId, secretAccessKey)
        .then(() => {
          showStatus("Testing AWS connection...", "")
          return testAWSConnectivity()
        })
        .then((result) => {
          if (result.success) {
            showStatus("AWS connection test successful!", "success")
          } else {
            showStatus(`AWS connection test failed: ${result.error}`, "error")
          }
        })
        .catch((error) => {
          showStatus(`Error: ${error.message}`, "error")
        })
    } else {
      showStatus("Please enter AWS credentials first", "error")
    }
  })

  // Helper function to show status
  function showStatus(message, type) {
    statusMessage.textContent = message
    statusMessage.className = type
    statusMessage.style.display = "block"

    if (type === "success") {
      setTimeout(() => {
        statusMessage.style.display = "none"
      }, 3000)
    }
  }
})

// Function to execute in the current tab - extract products only
function extractProductsOnly() {
  // This function is executed in the content script context
  if (typeof window.productExtractor === "undefined") {
    console.error("Product extractor not found on this page")
    return { success: false, error: "Product extractor not found on this page" }
  }

  try {
    console.log("Starting product extraction from popup")
    window.productExtractor
      .extractProducts(false)
      .then((products) => {
        console.log(`Extracted ${products.length} products from popup`)
        return { success: true, count: products.length }
      })
      .catch((error) => {
        console.error("Error extracting products:", error)
        return { success: false, error: error.message }
      })
  } catch (error) {
    console.error("Error in extraction process:", error)
    return { success: false, error: error.message }
  }
}

// Function to execute extraction and save in the current tab
function extractAndSaveProducts() {
  // This function is executed in the content script context
  if (typeof window.productExtractor === "undefined") {
    console.error("Product extractor not found on this page")
    return { success: false, error: "Product extractor not found on this page" }
  }

  try {
    console.log("Starting product extraction and save from popup")
    window.productExtractor
      .extractProducts(false)
      .then((products) => {
        console.log(`Extracted and saved ${products.length} products from popup`)
        return { success: true, count: products.length }
      })
      .catch((error) => {
        console.error("Error extracting and saving products:", error)
        return { success: false, error: error.message }
      })
  } catch (error) {
    console.error("Error in extraction and save process:", error)
    return { success: false, error: error.message }
  }
}
