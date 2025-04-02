// Instead of direct injection, we'll use a more CSP-friendly approach
// by creating a script element that loads from the extension

// Load the main content script
import "./content/index.js"
import { statusOverlay } from "./utils/overlay.js"

// Set up message passing for communication between content script and page
window.addEventListener("message", async function (event) {
  // Only respond to messages from our page
  if (event.source !== window) return

  // Check if the message is from our page script
  if (event.data.type === "SAVE_TO_DYNAMODB") {
    try {
      // Import dynamically to avoid module issues in content scripts
      const { saveProductsToDynamoDB } = await import("./api.js")

      // Show in-progress notification
      statusOverlay.showInfo(`Sending products to DynamoDB...`)

      // Save the products
      const result = await saveProductsToDynamoDB(event.data.products)

      // Show success message
      statusOverlay.showSuccess(
        `Successfully saved ${event.data.products.length} products to DynamoDB`,
      )

      // Send the response back
      window.postMessage(
        {
          type: "SAVE_TO_DYNAMODB_RESPONSE",
          success: true,
          result: result,
        },
        "*",
      )
    } catch (error) {
      // Show error message
      statusOverlay.showError(`Error saving products: ${error.message}`)

      // Send the error back
      window.postMessage(
        {
          type: "SAVE_TO_DYNAMODB_RESPONSE",
          success: false,
          error: error.message,
        },
        "*",
      )
    }
  } else if (event.data.type === "TEST_AWS_CONNECTIVITY") {
    try {
      // Import dynamically to avoid module issues in content scripts
      const { testAWSConnectivity } = await import("./api.js")

      // Show testing message
      statusOverlay.showInfo("Testing AWS connectivity...")

      // Test connectivity
      const result = await testAWSConnectivity()

      // Show result message
      if (result.success) {
        statusOverlay.showSuccess("AWS connectivity test successful!")
      } else {
        statusOverlay.showError(`AWS connectivity test failed: ${result.error}`)
      }

      // Send the response back
      window.postMessage(
        {
          type: "TEST_AWS_CONNECTIVITY_RESPONSE",
          success: true,
          result: result,
        },
        "*",
      )
    } catch (error) {
      // Show error message
      statusOverlay.showError(`AWS connectivity test error: ${error.message}`)

      // Send the error back
      window.postMessage(
        {
          type: "TEST_AWS_CONNECTIVITY_RESPONSE",
          success: false,
          error: error.message,
        },
        "*",
      )
    }
  }
})

// We need to expose the API methods to the page
// Instead of injecting script, we'll make the methods available through postMessage
window.addEventListener("DOMContentLoaded", () => {
  // Add a <script> tag to the page that sets up message passing
  const script = document.createElement("script")
  script.src = chrome.runtime.getURL("page-script.bundle.js")
  ;(document.head || document.documentElement).appendChild(script)
  script.onload = () => script.remove()
})
