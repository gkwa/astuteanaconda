import { saveProductsToDynamoDB } from '../api.js';

// Function to extract products
export function extractProductsFromPage() {
  console.log("DEBUGGING: Starting extractProductsFromPage function");
  console.log("Checking for SocialSparrow API...");

  if (typeof window.SocialSparrow === "undefined") {
    console.error("SocialSparrow API not found on this page");
    return null;
  }

  console.log("DEBUGGING: SocialSparrow API detected on page");
  console.log("SocialSparrow API object keys:", Object.keys(window.SocialSparrow));
  console.log(
    "SocialSparrow API methods:",
    Object.getOwnPropertyNames(window.SocialSparrow).filter(
      (prop) => typeof window.SocialSparrow[prop] === "function",
    ),
  );

  try {
    if (typeof window.SocialSparrow.extractProducts !== "function") {
      console.error("DEBUGGING: SocialSparrow.extractProducts is not a function");
      return null;
    }

    console.log("DEBUGGING: Calling SocialSparrow.extractProducts()");
    const products = window.SocialSparrow.extractProducts();
    console.log("DEBUGGING: extractProducts() returned:", products);

    console.log("DEBUGGING: Full product JSON:", JSON.stringify(products, null, 2));
    console.log(`Current site: ${window.location.hostname}`);

    if (products === undefined || products === null) {
      console.error("DEBUGGING: SocialSparrow.extractProducts() returned undefined or null");
      return [];
    }

    console.log(`DEBUGGING: Product return type: ${typeof products}`);

    if (window._socialsparrow && window._socialsparrow.products) {
      console.log("DEBUGGING: Found products directly in window._socialsparrow.products");
      console.log(`DEBUGGING: Found ${window._socialsparrow.products.length} products`);
      return window._socialsparrow.products;
    }

    let productArray = [];
    if (typeof products === "object" && !Array.isArray(products)) {
      console.log("DEBUGGING: Product is an object, not an array");
      console.log("DEBUGGING: Object keys:", Object.keys(products));

      if (products.items && Array.isArray(products.items)) {
        productArray = products.items;
        console.log("DEBUGGING: Found products in items property");
      } else if (products.products && Array.isArray(products.products)) {
        productArray = products.products;
        console.log("DEBUGGING: Found products in products property");
      } else if (products.searchTerm && products.products) {
        productArray = products.products;
        console.log(
          `DEBUGGING: Found search results for "${products.searchTerm}" with ${productArray.length} products`,
        );
      } else {
        const keys = Object.keys(products);
        if (keys.length > 0 && keys.every((k) => !isNaN(parseInt(k)))) {
          productArray = Object.values(products);
          console.log("DEBUGGING: Converted object with numeric keys to array");
        } else {
          for (const key in products) {
            if (typeof products[key] === "object" && products[key] !== null) {
              if (products[key].name || products[key].title || products[key].productName) {
                productArray.push(products[key]);
                console.log(`DEBUGGING: Added object property ${key} to products array`);
              }
            }
          }
          console.log("DEBUGGING: Extracted potential product objects from properties");
        }
      }
    } else if (Array.isArray(products)) {
      console.log("DEBUGGING: Products is already an array");
      productArray = products;
    }

    console.log(`DEBUGGING: Found ${productArray.length} product elements`);

    if (productArray.length > 0) {
      console.log("DEBUGGING: Products extracted from page:");
      console.table(productArray);
      console.log(`DEBUGGING: Total products found: ${productArray.length}`);

      console.log("DEBUGGING: Saving products to DynamoDB");
      saveProductsToDynamoDB(productArray)
        .then((result) => {
          console.log("DEBUGGING: Products saved to DynamoDB:", result);
        })
        .catch((error) => {
          console.error("DEBUGGING: Error saving products to DynamoDB:", error);
        });
    } else {
      console.log("DEBUGGING: No products found (empty array returned)");
    }

    return productArray;
  } catch (error) {
    console.error("DEBUGGING: Error extracting products:", error);
    console.error("DEBUGGING: Error stack:", error.stack);
    return [];
  }
}

// Function to extract products from DOM as a fallback
export function extractProductsFromDOM() {
  console.log("DEBUGGING: Attempting to extract products from DOM elements");
  const products = [];

  try {
    const productContainers = document.querySelectorAll(
      '.product-grid, .products-grid, [data-test="product-grid"], [data-test="search-results"]',
    );

    if (productContainers.length === 0) {
      console.log("DEBUGGING: No product containers found in DOM");
      return [];
    }

    productContainers.forEach((container) => {
      const productElements = container.querySelectorAll(
        '.product, .product-card, [data-test="product-card"]',
      );
      console.log(`DEBUGGING: Found ${productElements.length} product elements in container`);

      productElements.forEach((productEl) => {
        try {
          const titleEl = productEl.querySelector(
            '.product-title, .product-name, [data-test="product-title"]',
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
          console.log("DEBUGGING: Error extracting individual product:", err);
        }
      });
    });

    if (products.length > 0) {
      console.log("DEBUGGING: Saving DOM-extracted products to DynamoDB");
      saveProductsToDynamoDB(products)
        .then((result) => {
          console.log("DEBUGGING: DOM-extracted products saved to DynamoDB:", result);
        })
        .catch((error) => {
          console.error("DEBUGGING: Error saving DOM-extracted products to DynamoDB:", error);
        });
    }

    return products;
  } catch (error) {
    console.error("DEBUGGING: Error in DOM extraction:", error);
    return [];
  }
}
