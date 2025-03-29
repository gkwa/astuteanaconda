import { setupNetworkInterceptor } from "./network-interceptor.js"
import { extractProductsFromPage, extractProductsFromDOM } from "./product-extractor.js"
import { waitForSocialSparrow } from "./social-sparrow.js"
import { testAWSConnectivity } from "../api.js"

// Initialize everything
function init() {
  // Set up network interceptors
  setupNetworkInterceptor()

  // Test AWS connectivity on startup
  console.log("DEBUGGING: Testing AWS connectivity...")
  testAWSConnectivity()
    .then((result) => {
      console.log("DEBUGGING: AWS connectivity test result:", result)
    })
    .catch((error) => {
      console.error("DEBUGGING: AWS connectivity test error:", error)
    })

  // Initial extraction with retry mechanism
  console.log("DEBUGGING: Content script loaded, setting up initial extraction")
  setTimeout(() => {
    console.log("DEBUGGING: Starting initial extraction")
    waitForSocialSparrow()
      .then((socialSparrow) => {
        console.log("DEBUGGING: SocialSparrow found, calling extractProductsFromPage")
        return extractProductsFromPage()
      })
      .catch((error) => {
        console.error("DEBUGGING: Failed to load SocialSparrow:", error)
        // Try DOM-based extraction as fallback
        console.log("DEBUGGING: Attempting DOM-based extraction as fallback")
        extractProductsFromDOM()
      })
  }, 2000)

  // Track URL changes for single-page applications
  console.log("DEBUGGING: Setting up MutationObserver for URL changes")
  let lastUrl = location.href
  new MutationObserver(() => {
    const url = location.href
    if (url !== lastUrl) {
      lastUrl = url
      console.log("DEBUGGING: Page navigation detected, waiting for content to load...")

      // Wait a bit for the new page content to load
      setTimeout(() => {
        console.log("DEBUGGING: Extracting products after navigation")
        waitForSocialSparrow()
          .then(() => extractProductsFromPage())
          .catch((error) => {
            console.error("DEBUGGING: Failed to load SocialSparrow after navigation:", error)
            // Try DOM-based extraction as fallback
            extractProductsFromDOM()
          })
      }, 3000) // Increased wait time to 3 seconds
    }
  }).observe(document, { subtree: true, childList: true })

  console.log("DEBUGGING: Content script initialization complete")
}

// Start the initialization
init()
