// Instead of direct injection, we'll use a more CSP-friendly approach
// by creating a script element that loads from the extension

// Load the main content script
import "./content/index.js"

// Set up message passing for communication between content script and page
window.addEventListener("message", async function (event) {
  // Only respond to messages from our page
  if (event.source !== window) return

  // Check if the message is from our page script
  if (event.data.type === "SAVE_TO_DYNAMODB") {
    try {
      // Import dynamically to avoid module issues in content scripts
      const { saveProductsToDynamoDB } = await import("./api.js")

      // Save the products
      const result = await saveProductsToDynamoDB(event.data.products)

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

      // Test connectivity
      const result = await testAWSConnectivity()

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
