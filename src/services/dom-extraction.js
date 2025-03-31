/**
 * Extract products from DOM as a fallback
 */
import { debug, error } from "../utils/logger.js";

export function extractProductsFromDOM() {
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
