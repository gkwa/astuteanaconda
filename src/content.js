import { saveProductsToDynamoDB, testAWSConnectivity } from "./api.js"

// Function to extract products
function extractProductsFromPage() {
  console.log("DEBUGGING: Starting extractProductsFromPage function")
  console.log("Checking for SocialSparrow API...")

  // Check if SocialSparrow is available
  if (typeof window.SocialSparrow === "undefined") {
    console.error("SocialSparrow API not found on this page")
    return null
  }

  console.log("DEBUGGING: SocialSparrow API detected on page")
  console.log("SocialSparrow API object keys:", Object.keys(window.SocialSparrow))
  console.log(
    "SocialSparrow API methods:",
    Object.getOwnPropertyNames(window.SocialSparrow).filter(
      (prop) => typeof window.SocialSparrow[prop] === "function",
    ),
  )

  try {
    // Check if extractProducts method exists
    if (typeof window.SocialSparrow.extractProducts !== "function") {
      console.error("DEBUGGING: SocialSparrow.extractProducts is not a function")
      return null
    }

    console.log("DEBUGGING: Calling SocialSparrow.extractProducts()")
    // Extract products using SocialSparrow API
    const products = window.SocialSparrow.extractProducts()
    console.log("DEBUGGING: extractProducts() returned:", products)

    // Print full JSON for debugging
    console.log("DEBUGGING: Full product JSON:", JSON.stringify(products, null, 2))

    // Log the current site
    console.log(`Current site: ${window.location.hostname}`)

    // Check if products is undefined or null
    if (products === undefined || products === null) {
      console.error("DEBUGGING: SocialSparrow.extractProducts() returned undefined or null")
      return []
    }

    // Log the product return type for debugging
    console.log(`DEBUGGING: Product return type: ${typeof products}`)

    // Check if we have access to window._socialsparrow and its data
    if (window._socialsparrow && window._socialsparrow.products) {
      console.log("DEBUGGING: Found products directly in window._socialsparrow.products")
      console.log(`DEBUGGING: Found ${window._socialsparrow.products.length} products`)
      return window._socialsparrow.products
    }

    // Handle the case where products is an object but not an array
    let productArray = []
    if (typeof products === "object" && !Array.isArray(products)) {
      console.log("DEBUGGING: Product is an object, not an array")
      console.log("DEBUGGING: Object keys:", Object.keys(products))

      if (products.items && Array.isArray(products.items)) {
        // Try to get products from an "items" property
        productArray = products.items
        console.log("DEBUGGING: Found products in items property")
      } else if (products.products && Array.isArray(products.products)) {
        // Try to get products from a "products" property
        productArray = products.products
        console.log("DEBUGGING: Found products in products property")
      } else if (products.searchTerm && products.products) {
        // Special case for search results format
        productArray = products.products
        console.log(
          `DEBUGGING: Found search results for "${products.searchTerm}" with ${productArray.length} products`,
        )
      } else {
        // Try to convert the object to an array if it has numeric keys
        const keys = Object.keys(products)
        if (keys.length > 0 && keys.every((k) => !isNaN(parseInt(k)))) {
          productArray = Object.values(products)
          console.log("DEBUGGING: Converted object with numeric keys to array")
        } else {
          // Last resort: check each property to see if it looks like a product
          for (const key in products) {
            if (typeof products[key] === "object" && products[key] !== null) {
              if (products[key].name || products[key].title || products[key].productName) {
                productArray.push(products[key])
                console.log(`DEBUGGING: Added object property ${key} to products array`)
              }
            }
          }
          console.log("DEBUGGING: Extracted potential product objects from properties")
        }
      }
    } else if (Array.isArray(products)) {
      console.log("DEBUGGING: Products is already an array")
      productArray = products
    }

    // Log the number of products found
    console.log(`DEBUGGING: Found ${productArray.length} product elements`)

    if (productArray.length > 0) {
      // Log the products directly
      console.log("DEBUGGING: Products extracted from page:")
      console.table(productArray)
      console.log(`DEBUGGING: Total products found: ${productArray.length}`)
      
      // Save products to DynamoDB
      if (typeof window.saveToDynamoDB === "function") {
        console.log("DEBUGGING: Saving products to DynamoDB")
        window.saveToDynamoDB(productArray)
          .then(result => {
            console.log("DEBUGGING: Products saved to DynamoDB:", result)
          })
          .catch(error => {
            console.error("DEBUGGING: Error saving products to DynamoDB:", error)
          })
      }
    } else {
      console.log("DEBUGGING: No products found (empty array returned)")
    }

    return productArray
  } catch (error) {
    console.error("DEBUGGING: Error extracting products:", error)
    console.error("DEBUGGING: Error stack:", error.stack)
    return []
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

    // Save products to DynamoDB if available
    if (products.length > 0 && typeof window.saveToDynamoDB === "function") {
      console.log("DEBUGGING: Saving DOM-extracted products to DynamoDB")
      window.saveToDynamoDB(products)
        .then(result => {
          console.log("DEBUGGING: DOM-extracted products saved to DynamoDB:", result)
        })
        .catch(error => {
          console.error("DEBUGGING: Error saving DOM-extracted products to DynamoDB:", error)
        })
    }

    return products
  } catch (error) {
    console.error("DEBUGGING: Error in DOM extraction:", error)
    return []
  }
}

// Function to attempt to intercept API responses
function setupNetworkInterceptor() {
  console.log("DEBUGGING: Setting up network interceptor")

  // Create a proxy for the fetch function
  const originalFetch = window.fetch
  window.fetch = async function (...args) {
    const response = await originalFetch(...args)

    // Clone the response so we can read it and still return the original
    const clone = response.clone()
    const url = args[0] instanceof Request ? args[0].url : args[0]

    // Check if this is likely a product API endpoint
    if (url.includes("product") || url.includes("search") || url.includes("api")) {
      try {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          clone
            .json()
            .then((data) => {
              console.log(`DEBUGGING: Intercepted API response from ${url}:`, data)

              // Try to identify product data in the response
              if (data && (data.products || data.items)) {
                console.log("DEBUGGING: Found potential product data in API response")
                window._interceptedProductData = data
                
                // Save to DynamoDB if possible
                const productsData = data.products || data.items
                if (Array.isArray(productsData) && productsData.length > 0 && 
                    typeof window.saveToDynamoDB === "function") {
                  console.log("DEBUGGING: Saving intercepted products to DynamoDB")
                  window.saveToDynamoDB(productsData)
                    .then(result => {
                      console.log("DEBUGGING: Intercepted products saved to DynamoDB:", result)
                    })
                    .catch(error => {
                      console.error("DEBUGGING: Error saving intercepted products to DynamoDB:", error)
                    })
                }
              }
            })
            .catch((err) => {
              console.log(`DEBUGGING: Error parsing intercepted JSON:`, err)
            })
        }
      } catch (err) {
        console.log("DEBUGGING: Error in fetch interceptor:", err)
      }
    }

    return response
  }

  // Intercept XHR requests as well
  const originalXHROpen = XMLHttpRequest.prototype.open
  const originalXHRSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (...args) {
    this._url = args[1]
    return originalXHROpen.apply(this, args)
  }

  XMLHttpRequest.prototype.send = function (...args) {
    const xhr = this
    const originalOnReadyStateChange = xhr.onreadystatechange

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const url = xhr._url
        if (url && (url.includes("product") || url.includes("search") || url.includes("api"))) {
          try {
            const contentType = xhr.getResponseHeader("content-type")
            if (contentType && contentType.includes("application/json")) {
              const data = JSON.parse(xhr.responseText)
              console.log(`DEBUGGING: Intercepted XHR response from ${url}:`, data)

              // Try to identify product data in the response
              if (data && (data.products || data.items)) {
                console.log("DEBUGGING: Found potential product data in XHR response")
                window._interceptedXHRData = data
                
                // Save to DynamoDB if possible
                const productsData = data.products || data.items
                if (Array.isArray(productsData) && productsData.length > 0 && 
                    typeof window.saveToDynamoDB === "function") {
                  console.log("DEBUGGING: Saving XHR intercepted products to DynamoDB")
                  window.saveToDynamoDB(productsData)
                    .then(result => {
                      console.log("DEBUGGING: XHR intercepted products saved to DynamoDB:", result)
                    })
                    .catch(error => {
                      console.error("DEBUGGING: Error saving XHR intercepted products to DynamoDB:", error)
                    })
                }
              }
            }
          } catch (err) {
            console.log("DEBUGGING: Error parsing XHR JSON:", err)
          }
        }
      }

      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(xhr, arguments)
      }
    }

    return originalXHRSend.apply(xhr, args)
  }

  console.log("DEBUGGING: Network interceptors set up successfully")
}

// Make the function available globally
window.saveToDynamoDB = saveProductsToDynamoDB;
window.testAWSConnectivity = testAWSConnectivity;

// Wait longer before initial extraction
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

// Set up network interceptors
setupNetworkInterceptor()

// Test AWS connectivity on startup
console.log("DEBUGGING: Testing AWS connectivity...")
testAWSConnectivity()
  .then(result => {
    console.log("DEBUGGING: AWS connectivity test result:", result)
  })
  .catch(error => {
    console.error("DEBUGGING: AWS connectivity test error:", error)
  });

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
}, 2000) // Wait 2 seconds before starting

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
