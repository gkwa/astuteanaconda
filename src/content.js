// Add these functions at the end of your existing content.js file

// Function to register this page with the background service worker
function registerWithServiceWorker() {
  console.log("DEBUGGING: Registering page with service worker")
  chrome.runtime.sendMessage(
    {
      type: "REGISTER_PRODUCT_PAGE",
    },
    (response) => {
      if (response && response.success) {
        console.log("DEBUGGING: Successfully registered with service worker")
      } else {
        console.error("DEBUGGING: Failed to register with service worker", response)
      }
    },
  )
}

// Function to request background extraction
function requestBackgroundExtraction() {
  console.log("DEBUGGING: Requesting background extraction")
  chrome.runtime.sendMessage(
    {
      type: "EXTRACT_PRODUCTS_BACKGROUND",
    },
    (response) => {
      if (response && response.success) {
        console.log("DEBUGGING: Background extraction initiated", response)
      } else {
        console.error("DEBUGGING: Failed to initiate background extraction", response)
      }
    },
  )
}

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "BACKGROUND_FETCH_RESULT") {
    console.log("DEBUGGING: Received background fetch result:", message.data)
    // Store the data for later use
    window._backgroundExtractedProducts = message.data
    return true
  }
})

// Call the registration function when the content script loads
registerWithServiceWorker()

// Modify your existing waitForSocialSparrow function to request background extraction
// Add this at the end of the waitForSocialSparrow function, right before the resolve call
function waitForSocialSparrow(maxAttempts = 15, interval = 1000) {
  console.log("DEBUGGING: Starting waitForSocialSparrow")
  return new Promise((resolve, reject) => {
    let attempts = 0
    const checkSocialSparrow = () => {
      attempts++
      console.log(`DEBUGGING: Checking for SocialSparrow (attempt ${attempts}/${maxAttempts})...`)
      if (typeof window.SocialSparrow !== "undefined") {
        console.log("DEBUGGING: SocialSparrow API loaded successfully")
        // Check if it's fully initialized
        if (typeof window.SocialSparrow.extractProducts === "function") {
          console.log("DEBUGGING: SocialSparrow API methods ready")

          // Request background extraction to ensure data is loaded
          // even when tab doesn't have focus
          requestBackgroundExtraction()

          // Wait a bit longer to ensure page content is loaded
          setTimeout(() => resolve(window.SocialSparrow), 500)
        } else {
          console.log("DEBUGGING: SocialSparrow API found but methods not ready yet")
          if (attempts >= maxAttempts) {
            reject(new Error("SocialSparrow API methods not available after maximum attempts"))
          } else {
            setTimeout(checkSocialSparrow, interval)
          }
        }
      } else if (attempts >= maxAttempts) {
        console.error("DEBUGGING: SocialSparrow API failed to load after maximum attempts")
        reject(new Error("SocialSparrow API not available"))
      } else {
        console.log(`DEBUGGING: SocialSparrow not found yet, trying again in ${interval}ms`)
        setTimeout(checkSocialSparrow, interval)
      }
    }
    checkSocialSparrow()
  })
}

// Also modify your extractProductsFromPage function to check for background-extracted products
// Add this to the beginning of the function:
function extractProductsFromPage() {
  console.log("DEBUGGING: Starting extractProductsFromPage function")

  // Check if we have background-extracted products
  if (window._backgroundExtractedProducts) {
    console.log("DEBUGGING: Using background-extracted products")
    return window._backgroundExtractedProducts
  }

  console.log("Checking for SocialSparrow API...")
  // Rest of the function remains the same...
}
