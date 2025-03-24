document.addEventListener("DOMContentLoaded", function () {
  const extractBtn = document.getElementById("extractBtn")

  extractBtn.addEventListener("click", async function () {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractProducts,
    })
  })
})

function extractProducts() {
  console.log("DEBUGGING: Extract button clicked, checking for SocialSparrow...")
  
  // First check if we have intercepted data
  if (window._interceptedProductData) {
    console.log("DEBUGGING: Using intercepted product data")
    displayProducts(window._interceptedProductData)
    return
  }

  // Check if SocialSparrow is available
  if (typeof window.SocialSparrow === "undefined") {
    console.error("SocialSparrow is not available on this page.")
    // Try DOM-based extraction as fallback
    const domProducts = extractProductsFromDOM()
    if (domProducts && domProducts.length > 0) {
      displayProducts({ products: domProducts })
    } else {
      alert("SocialSparrow API not available and couldn't extract products from DOM.")
    }
    return
  }

  try {
    // Check if extractProducts method exists
    if (typeof window.SocialSparrow.extractProducts !== "function") {
      console.error("SocialSparrow.extractProducts is not a function")
      // Try direct access to data if available
      if (window._socialsparrow && window._socialsparrow.products) {
        console.log("DEBUGGING: Found products directly in _socialsparrow")
        displayProducts({ products: window._socialsparrow.products })
        return
      }
      return
    }

    console.log("DEBUGGING: Calling SocialSparrow.extractProducts()")
    // Extract products using SocialSparrow API
    const products = window.SocialSparrow.extractProducts()
    console.log("DEBUGGING: extractProducts() returned:", products)
    
    // Print full JSON for debugging
    console.log("DEBUGGING: Full product JSON:", JSON.stringify(products, null, 2))

    // Check if products is undefined or null
    if (products === undefined || products === null) {
      console.error("SocialSparrow.extractProducts() returned undefined or null")
      // Try DOM-based extraction as fallback
      const domProducts = extractProductsFromDOM()
      if (domProducts && domProducts.length > 0) {
        displayProducts({ products: domProducts })
      } else {
        alert("SocialSparrow returned no data and couldn't extract products from DOM.")
      }
      return
    }

    displayProducts(products)
  } catch (error) {
    console.error("Error extracting products:", error)
    alert("Error extracting products. Check the console for details.")
  }
}

function displayProducts(productsData) {
  // Handle different product formats
  let processedProducts = productsData;
  
  // Handle object vs array
  if (typeof processedProducts === "object" && !Array.isArray(processedProducts)) {
    if (processedProducts.products && Array.isArray(processedProducts.products)) {
      processedProducts = processedProducts.products
    } else if (processedProducts.items && Array.isArray(processedProducts.items)) {
      processedProducts = processedProducts.items
    } else {
      processedProducts = [processedProducts]
    }
  }

  // Log products directly
  console.log("Products from SocialSparrow API:")
  console.table(processedProducts)
  console.log(`Total products found: ${Array.isArray(processedProducts) ? processedProducts.length : "unknown"}`)

  // Display a notification to the user
  if (Array.isArray(processedProducts) && processedProducts.length > 0) {
    alert(`Successfully found ${processedProducts.length} products! Check the console for details.`)
  } else {
    alert("Product data retrieved but format is unexpected. Check the console for details.")
  }

  // Optionally copy to clipboard as well
  if (typeof window.SocialSparrow?.extractProductsToClipboard === "function") {
    console.log("DEBUGGING: Calling extractProductsToClipboard")
    window.SocialSparrow.extractProductsToClipboard()
      .then((data) => console.log("Products copied to clipboard:", data))
      .catch((error) => console.error("Error copying to clipboard:", error))
  } else {
    console.error("SocialSparrow.extractProductsToClipboard is not a function")
    
    // Manual clipboard copy as fallback
    try {
      const jsonStr = JSON.stringify(processedProducts, null, 2)
      navigator.clipboard.writeText(jsonStr)
        .then(() => console.log("Products copied to clipboard manually"))
        .catch(err => console.error("Error copying to clipboard manually:", err))
    } catch (e) {
      console.error("Error in manual clipboard copy:", e)
    }
  }
}

// Function to extract products from DOM as a fallback
function extractProductsFromDOM() {
  console.log("DEBUGGING: Attempting to extract products from DOM elements")
  const products = [];
  
  try {
    // Look for common product grid containers
    const productContainers = document.querySelectorAll('.product-grid, .products-grid, [data-test="product-grid"], [data-test="search-results"]');
    
    if (productContainers.length === 0) {
      console.log("DEBUGGING: No product containers found in DOM");
      return [];
    }
    
    // For each container, find product elements
    productContainers.forEach(container => {
      const productElements = container.querySelectorAll('.product, .product-card, [data-test="product-card"]');
      console.log(`DEBUGGING: Found ${productElements.length} product elements in container`);
      
      productElements.forEach(productEl => {
        try {
          // Extract product details
          const titleEl = productEl.querySelector('.product-title, .product-name, [data-test="product-title"]');
          const priceEl = productEl.querySelector('.product-price, [data-test="product-price"]');
          const imageEl = productEl.querySelector('img');
          
          const product = {
            name: titleEl ? titleEl.textContent.trim() : '',
            price: priceEl ? priceEl.textContent.trim() : '',
            imageUrl: imageEl ? imageEl.src : '',
            url: productEl.querySelector('a') ? productEl.querySelector('a').href : ''
          };
          
          // Only add if we have at least a name
          if (product.name) {
            products.push(product);
          }
        } catch (err) {
          console.log("DEBUGGING: Error extracting individual product:", err);
        }
      });
    });
    
    return products;
  } catch (error) {
    console.error("DEBUGGING: Error in DOM extraction:", error);
    return [];
  }
}
