import { setupNetworkInterceptor } from "./network-interceptor.js"
import { productExtractor } from "../services/product-extraction-service.js"
import { testAWSConnectivity } from "../api.js"
import { debug, error } from "../utils/logger.js"

// Initialize everything
function init() {
  // Set up network interceptors
  setupNetworkInterceptor()

  // Test AWS connectivity on startup
  debug("Testing AWS connectivity...")
  testAWSConnectivity()
    .then((result) => {
      debug("AWS connectivity test result:", result)
    })
    .catch((error) => {
      error("AWS connectivity test error:", error)
    })

  // Initial extraction with retry mechanism
  debug("Content script loaded, setting up initial extraction")
  setTimeout(() => {
    debug("Starting initial extraction")
    productExtractor
      .extractProducts()
      .then((products) => {
        debug(`Initial extraction complete, found ${products.length} products`)
      })
      .catch((err) => {
        error("Error during initial extraction:", err)
      })
  }, 2000)

  // Track URL changes for single-page applications
  debug("Setting up MutationObserver for URL changes")
  let lastUrl = location.href
  new MutationObserver(() => {
    const url = location.href
    if (url !== lastUrl) {
      lastUrl = url
      debug("Page navigation detected, waiting for content to load...")

      // Wait a bit for the new page content to load
      setTimeout(() => {
        debug("Extracting products after navigation")
        productExtractor
          .extractProducts()
          .then((products) => {
            debug(`Post-navigation extraction complete, found ${products.length} products`)
          })
          .catch((err) => {
            error("Error during post-navigation extraction:", err)
          })
      }, 3000) // Increased wait time to 3 seconds
    }
  }).observe(document, { subtree: true, childList: true })

  debug("Content script initialization complete")
}

// Start the initialization
init()
