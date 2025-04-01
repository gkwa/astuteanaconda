/**
 * Normalize different product data formats into a consistent array
 * @param {any} products - Products data in various formats
 * @returns {Array} - Normalized array of products
 */
import { debug } from "../utils/logger.js"

export function normalizeProductData(products) {
  let productArray = []

  if (typeof products === "object" && !Array.isArray(products)) {
    debug("Product is an object, not an array")
    debug("Object keys:", Object.keys(products))

    if (products.items && Array.isArray(products.items)) {
      productArray = products.items
      debug("Found products in items property")
    } else if (products.products && Array.isArray(products.products)) {
      productArray = products.products
      debug("Found products in products property")
    } else if (products.searchTerm && products.products) {
      productArray = products.products
      debug(
        `Found search results for "${products.searchTerm}" with ${productArray.length} products`,
      )
    } else {
      const keys = Object.keys(products)
      if (keys.length > 0 && keys.every((k) => !isNaN(parseInt(k)))) {
        productArray = Object.values(products)
        debug("Converted object with numeric keys to array")
      } else {
        for (const key in products) {
          if (typeof products[key] === "object" && products[key] !== null) {
            if (products[key].name || products[key].title || products[key].productName) {
              productArray.push(products[key])
              debug(`Added object property ${key} to products array`)
            }
          }
        }
        debug("Extracted potential product objects from properties")
      }
    }
  } else if (Array.isArray(products)) {
    debug("Products is already an array")
    productArray = products
  }

  debug(`Found ${productArray.length} product elements`)
  return productArray
}
