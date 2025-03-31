/**
 * Service responsible for product extraction operations
 * Following the Single Responsibility Principle
 */
import { saveProductsToDynamoDB } from "../api.js";
import { debug, error } from "../utils/logger.js";

/**
 * ProductExtractionService - Handles all product extraction operations
 * This follows the Single Responsibility Principle by focusing only on extraction
 */
class ProductExtractionService {
  constructor() {
    this.socialSparrowAvailable = false;
  }

  /**
   * Checks if SocialSparrow API is available
   * @returns {boolean} Whether SocialSparrow is available
   */
  checkSocialSparrowAvailability() {
    this.socialSparrowAvailable = typeof window.SocialSparrow !== "undefined" && 
                                 typeof window.SocialSparrow.extractProducts === "function";
    debug(`SocialSparrow availability check: ${this.socialSparrowAvailable}`);
    return this.socialSparrowAvailable;
  }

  /**
   * Wait for SocialSparrow to become available
   * @param {number} maxAttempts - Maximum number of attempts to check
   * @param {number} interval - Interval between checks in milliseconds
   * @returns {Promise<object>} - Promise resolving to SocialSparrow object
   */
  waitForSocialSparrow(maxAttempts = 15, interval = 1000) {
    debug("Starting waitForSocialSparrow");
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const checkSocialSparrow = () => {
        attempts++;
        debug(`Checking for SocialSparrow (attempt ${attempts}/${maxAttempts})...`);

        if (typeof window.SocialSparrow !== "undefined") {
          debug("SocialSparrow API loaded successfully");

          if (typeof window.SocialSparrow.extractProducts === "function") {
            debug("SocialSparrow API methods ready");
            this.socialSparrowAvailable = true;
            setTimeout(() => resolve(window.SocialSparrow), 500);
          } else {
            debug("SocialSparrow API found but methods not ready yet");
            if (attempts >= maxAttempts) {
              this.socialSparrowAvailable = false;
              reject(new Error("SocialSparrow API methods not available after maximum attempts"));
            } else {
              setTimeout(checkSocialSparrow, interval);
            }
          }
        } else if (attempts >= maxAttempts) {
          error("SocialSparrow API failed to load after maximum attempts");
          this.socialSparrowAvailable = false;
          reject(new Error("SocialSparrow API not available"));
        } else {
          debug(`SocialSparrow not found yet, trying again in ${interval}ms`);
          setTimeout(checkSocialSparrow, interval);
        }
      };

      checkSocialSparrow();
    });
  }

  /**
   * Extract products from the page using the most appropriate method
   * @param {boolean} forceDomExtraction - Force DOM-based extraction
   * @returns {Promise<Array>} - Promise resolving to array of products
   */
  async extractProducts(forceDomExtraction = false) {
    debug("Starting product extraction process");
    
    let products = [];
    
    try {
      // First try SocialSparrow extraction unless DOM extraction is forced
      if (!forceDomExtraction) {
        if (!this.socialSparrowAvailable) {
          try {
            await this.waitForSocialSparrow();
          } catch (sparrowError) {
            debug("SocialSparrow not available, will try DOM extraction");
          }
        }
        
        if (this.socialSparrowAvailable) {
          debug("Extracting products using SocialSparrow API");
          products = await this.extractProductsFromSocialSparrow();
        }
      }
      
      // If no products found or DOM extraction forced, try DOM extraction
      if (products.length === 0 || forceDomExtraction) {
        debug("Falling back to DOM-based extraction");
        products = this.extractProductsFromDOM();
      }
      
      // Save the products if any were found
      if (products.length > 0) {
        debug(`Total products found: ${products.length}`);
        if (products.length > 0) {
          console.table(products);
        }
        
        debug("Saving products to DynamoDB");
        try {
          const result = await saveProductsToDynamoDB(products);
          debug("Products saved to DynamoDB:", result);
        } catch (dbError) {
          error("Error saving products to DynamoDB:", dbError);
        }
      } else {
        debug("No products found");
      }
      
      return products;
    } catch (err) {
      error("Error in product extraction process:", err);
      return [];
    }
  }

  /**
   * Extract products using SocialSparrow API
   * @returns {Array} - Array of products
   */
  extractProductsFromSocialSparrow() {
    debug("Starting extractProductsFromSocialSparrow function");
    
    if (typeof window.SocialSparrow === "undefined") {
      error("SocialSparrow API not found on this page");
      return [];
    }
    
    debug("SocialSparrow API detected on page");
    
    try {
      if (typeof window.SocialSparrow.extractProducts !== "function") {
        error("SocialSparrow.extractProducts is not a function");
        return [];
      }

      debug("Calling SocialSparrow.extractProducts()");
      const products = window.SocialSparrow.extractProducts();
      debug("extractProducts() returned:", products);

      if (products === undefined || products === null) {
        error("SocialSparrow.extractProducts() returned undefined or null");
        return [];
      }

      debug(`Product return type: ${typeof products}`);

      // Check direct access to products through window._socialsparrow
      if (window._socialsparrow && window._socialsparrow.products) {
        debug("Found products directly in window._socialsparrow.products");
        debug(`Found ${window._socialsparrow.products.length} products`);
        return window._socialsparrow.products;
      }

      return this.normalizeProductData(products);
    } catch (error) {
      error("Error extracting products:", error);
      error("Error stack:", error.stack);
      return [];
    }
  }

  /**
   * Normalize different product data formats into a consistent array
   * @param {any} products - Products data in various formats
   * @returns {Array} - Normalized array of products
   */
  normalizeProductData(products) {
    let productArray = [];
    
    if (typeof products === "object" && !Array.isArray(products)) {
      debug("Product is an object, not an array");
      debug("Object keys:", Object.keys(products));

      if (products.items && Array.isArray(products.items)) {
        productArray = products.items;
        debug("Found products in items property");
      } else if (products.products && Array.isArray(products.products)) {
        productArray = products.products;
        debug("Found products in products property");
      } else if (products.searchTerm && products.products) {
        productArray = products.products;
        debug(`Found search results for "${products.searchTerm}" with ${productArray.length} products`);
      } else {
        const keys = Object.keys(products);
        if (keys.length > 0 && keys.every((k) => !isNaN(parseInt(k)))) {
          productArray = Object.values(products);
          debug("Converted object with numeric keys to array");
        } else {
          for (const key in products) {
            if (typeof products[key] === "object" && products[key] !== null) {
              if (products[key].name || products[key].title || products[key].productName) {
                productArray.push(products[key]);
                debug(`Added object property ${key} to products array`);
              }
            }
          }
          debug("Extracted potential product objects from properties");
        }
      }
    } else if (Array.isArray(products)) {
      debug("Products is already an array");
      productArray = products;
    }

    debug(`Found ${productArray.length} product elements`);
    return productArray;
  }

  /**
   * Extract products from DOM as a fallback
   * @returns {Array} - Array of products
   */
  extractProductsFromDOM() {
    debug("Attempting to extract products from DOM elements");
    const products = [];

    try {
      const productContainers = document.querySelectorAll(
        '.product-grid, .products-grid, [data-test="product-grid"], [data-test="search-results"]'
      );

      if (productContainers.length === 0) {
        debug("No product containers found in DOM");
        return [];
      }

      productContainers.forEach((container) => {
        const productElements = container.querySelectorAll(
          '.product, .product-card, [data-test="product-card"]'
        );
        debug(`Found ${productElements.length} product elements in container`);

        productElements.forEach((productEl) => {
          try {
            const titleEl = productEl.querySelector(
              '.product-title, .product-name, [data-test="product-title"]'
            );
            const priceEl = productEl.querySelector('.product-price, [data-test="product-price"]');
            const imageEl = productEl.querySelector("img");

            const product = {
              name: titleEl ? titleEl.textContent.trim() : "",
              price: priceEl ? priceEl.textContent.trim() : "",
              imageUrl: imageEl ? imageEl.src : "",
              url: productEl.querySelector("a") ? productEl.querySelector("a").href : "",
            };

            if (product.name) {
              products.push(product);
            }
          } catch (err) {
            debug("Error extracting individual product:", err);
          }
        });
      });

      return products;
    } catch (error) {
      error("Error in DOM extraction:", error);
      return [];
    }
  }
}

// Export a singleton instance
export const productExtractor = new ProductExtractionService();

