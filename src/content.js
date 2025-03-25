import { PRODUCT_SCHEMA, SEARCH_UTILS } from './schema.js';

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

      // Send products to background script for DynamoDB processing
      sendProductsToDynamoDB(window._socialsparrow.products)

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

      // Send products to background script for DynamoDB processing
      sendProductsToDynamoDB(productArray)
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

// Function to send products to background.js for DynamoDB processing
function sendProductsToDynamoDB(products) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    console.log("DEBUGGING: No products to send to DynamoDB")
    return
  }

  // Extract search query from URL if available
  const searchQuery = SEARCH_UTILS.extractSearchQuery();

  // Check if products are in the correct format and add search parameter
  const processedProducts = products.map(product => {
    // Create a copy of the product with the search parameter added
    const processedProduct = PRODUCT_SCHEMA.formatProduct(product);
    // If product doesn't have search parameter but we found one in URL, add it
    if (!processedProduct.search && searchQuery) {
      processedProduct.search = searchQuery;
    }
    return processedProduct;
  });

  console.log(
    `DEBUGGING: Sending ${processedProducts.length} products to background script for DynamoDB processing`,
  )

  // Send message to background script
  chrome.runtime.sendMessage(
    {
      type: "PRODUCTS_EXTRACTED",
      products: processedProducts,
    },
    (response) => {
      if (response && response.received) {
        console.log("DEBUGGING: Background script received products")
      } else {
        console.error(
          "DEBUGGING: Failed to send products to background script",
          chrome.runtime.lastError,
        )
      }
    },
  )
}

// Rest of content.js remains the same...
```

```
