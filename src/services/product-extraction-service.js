/**
 * Service responsible for product extraction operations
 * Following the Single Responsibility Principle
 */
import { saveProductsToDynamoDB } from "../api.js"
import { debug, error } from "../utils/logger.js"
import { formatDuration } from "./utils/duration-formatter.js"
import { normalizeProductData } from "./product-normalization.js"
import { extractProductsFromDOM } from "./dom-extraction.js"
import { statusOverlay } from "../utils/overlay.js"

/**
 * ProductExtractionService - Handles all product extraction operations
 * This follows the Single Responsibility Principle by focusing only on extraction
 */
class ProductExtractionService {
  constructor() {
    this.socialSparrowAvailable = false
  }

  /**
   * Checks if SocialSparrow API is available
   * @returns {boolean} Whether SocialSparrow is available
   */
  checkSocialSparrowAvailability() {
    this.socialSparrowAvailable =
      typeof window.SocialSparrow !== "undefined" &&
      typeof window.SocialSparrow.extractProducts === "function"
    debug(`SocialSparrow availability check: ${this.socialSparrowAvailable}`)
    return this.socialSparrowAvailable
  }

  /**
   * Exponential backoff retry for product extraction
   * @param {Function} extractionFunction - Function to extract products
   * @param {number} maxRetryTime - Maximum total retry time in milliseconds
   * @returns {Promise<Array>} - Promise resolving to array of products
   */
  async exponentialBackoffExtraction(extractionFunction, maxRetryTime = 90000) {
    const startTime = Date.now()
    let delay = 1000 // Start with 1 second
    const maxDelay = 10000 // Max delay between attempts
    let attempt = 0

    statusOverlay.showInfo("Scanning for products...")

    while (Date.now() - startTime < maxRetryTime) {
      attempt++
      const remainingTime = maxRetryTime - (Date.now() - startTime)

      debug(
        `Attempt ${attempt}: Product extraction at ${new Date().toISOString()} ` +
          `(Remaining time: ${formatDuration(remainingTime)})`,
      )

      if (attempt > 1) {
        statusOverlay.showInfo(`Scanning for products (attempt ${attempt})...`)
      }

      const products = await extractionFunction()

      if (products && products.length > 0) {
        debug(`Successfully extracted ${products.length} products after ${attempt} attempts`)
        statusOverlay.showSuccess(`Found ${products.length} products!`, 3000)
        return products
      }

      // Calculate next delay with exponential backoff
      const jitter = Math.random() * 1000 // Add some randomness
      await new Promise((resolve) => setTimeout(resolve, delay + jitter))

      // Increase delay exponentially, but cap it
      delay = Math.min(delay * 2, maxDelay)
    }

    debug(`Product extraction exhausted maximum retry time after ${attempt} attempts`)
    statusOverlay.showWarning("No products found after multiple attempts", 5000)
    return []
  }

  /**
   * Wait for SocialSparrow to become available
   * @param {number} maxAttempts - Maximum number of attempts to check
   * @param {number} interval - Interval between checks in milliseconds
   * @returns {Promise<object>} - Promise resolving to SocialSparrow object
   */
  waitForSocialSparrow(maxAttempts = 15, interval = 1000) {
    debug("Starting waitForSocialSparrow")
    statusOverlay.showInfo("Waiting for SocialSparrow API...")

    return new Promise((resolve, reject) => {
      let attempts = 0

      const checkSocialSparrow = () => {
        attempts++
        debug(`Checking for SocialSparrow (attempt ${attempts}/${maxAttempts})...`)

        if (typeof window.SocialSparrow !== "undefined") {
          debug("SocialSparrow API loaded successfully")

          if (typeof window.SocialSparrow.extractProducts === "function") {
            debug("SocialSparrow API methods ready")
            this.socialSparrowAvailable = true
            statusOverlay.showSuccess("SocialSparrow API ready", 2000)
            setTimeout(() => resolve(window.SocialSparrow), 500)
          } else {
            debug("SocialSparrow API found but methods not ready yet")
            if (attempts >= maxAttempts) {
              this.socialSparrowAvailable = false
              statusOverlay.showError("SocialSparrow API methods not available", 3000)
              reject(new Error("SocialSparrow API methods not available after maximum attempts"))
            } else {
              setTimeout(checkSocialSparrow, interval)
            }
          }
        } else if (attempts >= maxAttempts) {
          error("SocialSparrow API failed to load after maximum attempts")
          this.socialSparrowAvailable = false
          statusOverlay.showError("SocialSparrow API not available", 3000)
          reject(new Error("SocialSparrow API not available"))
        } else {
          debug(`SocialSparrow not found yet, trying again in ${interval}ms`)
          setTimeout(checkSocialSparrow, interval)
        }
      }

      checkSocialSparrow()
    })
  }

  /**
   * Extract products from the page using the most appropriate method
   * @param {boolean} forceDomExtraction - Force DOM-based extraction
   * @returns {Promise<Array>} - Promise resolving to array of products
   */
  async extractProducts(forceDomExtraction = false) {
    debug("Starting product extraction process")

    let products = []

    try {
      // First try SocialSparrow extraction unless DOM extraction is forced
      if (!forceDomExtraction) {
        if (!this.socialSparrowAvailable) {
          try {
            await this.waitForSocialSparrow()
          } catch (sparrowError) {
            debug("SocialSparrow not available, will try DOM extraction")
            statusOverlay.showInfo("SocialSparrow not available, trying DOM extraction...")
          }
        }

        if (this.socialSparrowAvailable) {
          debug("Extracting products using SocialSparrow API with exponential backoff")
          products = await this.exponentialBackoffExtraction(() =>
            Promise.resolve(this.extractProductsFromSocialSparrow()),
          )
        }
      }

      // If no products found or DOM extraction forced, try DOM extraction
      if (products.length === 0 || forceDomExtraction) {
        debug("Falling back to DOM-based extraction")
        statusOverlay.showInfo("Extracting products from page elements...")
        products = await this.exponentialBackoffExtraction(() =>
          Promise.resolve(extractProductsFromDOM()),
        )
      }

      // Save the products if any were found
      if (products.length > 0) {
        debug(`Total products found: ${products.length}`)

        if (products.length > 0) {
          console.table(products)
        }

        debug("Saving products to DynamoDB")
        try {
          const result = await saveProductsToDynamoDB(products)
          debug("Products saved to DynamoDB:", result)
          return products
        } catch (dbError) {
          error("Error saving products to DynamoDB:", dbError)
          statusOverlay.showError(`Error saving to DynamoDB: ${dbError.message}`, 8000)
          return products
        }
      } else {
        debug("No products found")
        statusOverlay.showError("No products found on this page", 5000)
        return []
      }
    } catch (err) {
      error("Error in product extraction process:", err)
      statusOverlay.showError(`Extraction error: ${err.message}`, 8000)
      return []
    }
  }

  /**
   * Extract products using SocialSparrow API
   * @returns {Array} - Array of products
   */
  extractProductsFromSocialSparrow() {
    debug("Starting extractProductsFromSocialSparrow function")

    if (typeof window.SocialSparrow === "undefined") {
      error("SocialSparrow API not found on this page")
      return []
    }

    debug("SocialSparrow API detected on page")

    try {
      if (typeof window.SocialSparrow.extractProducts !== "function") {
        error("SocialSparrow.extractProducts is not a function")
        return []
      }

      debug("Calling SocialSparrow.extractProducts()")
      const products = window.SocialSparrow.extractProducts()
      debug("extractProducts() returned:", products)

      if (products === undefined || products === null) {
        error("SocialSparrow.extractProducts() returned undefined or null")
        return []
      }

      debug(`Product return type: ${typeof products}`)

      // Check direct access to products through window._socialsparrow
      if (window._socialsparrow && window._socialsparrow.products) {
        debug("Found products directly in window._socialsparrow.products")
        debug(`Found ${window._socialsparrow.products.length} products`)
        return window._socialsparrow.products
      }

      return normalizeProductData(products)
    } catch (error) {
      error("Error extracting products:", error)
      error("Error stack:", error.stack)
      return []
    }
  }
}

// Export a singleton instance
export const productExtractor = new ProductExtractionService()
