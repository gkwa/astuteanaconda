// Function to extract products
function extractProductsFromPage() {
  console.log('Checking for SocialSparrow API...');
  
  // Check if SocialSparrow is available
  if (typeof SocialSparrow !== 'undefined') {
    console.log('SocialSparrow API detected on page');
    
    try {
      // Extract products
      const products = SocialSparrow.extractProducts();
      
      // Log the current site
      console.log(`Current site: ${window.location.hostname}`);
      
      // Log the number of products found
      console.log(`Found ${products ? products.length : 0} product elements`);
      
      if (products && products.length > 0) {
        // Create a completely separate array of ultra-simple objects
        const simpleProducts = [];
        
        for (let i = 0; i < products.length; i++) {
          // Use the most primitive way to create objects - direct property assignment
          const simpleObj = {};
          simpleObj.name = String(products[i].name || 'N/A');
          simpleObj.brand = String(products[i].brand || 'N/A');
          simpleObj.price = String(products[i].price || 'N/A');
          simpleObj.url = String(products[i].url || 'N/A');
          
          simpleProducts.push(simpleObj);
        }
        
        // First log just the raw data as strings to completely avoid object references
        console.log('Products extracted from page:');
        products.forEach((p, index) => {
          console.log(`Product ${index}: ${p.name || 'N/A'} - ${p.brand || 'N/A'} - ${p.price || 'N/A'}`);
        });
        
        // Then create a separate section for the table
        console.log('------- PRODUCT TABLE -------');
        console.table(simpleProducts);
        console.log(`Total products found: ${simpleProducts.length}`);
      } else {
        console.log('No products found or empty array returned');
      }
      
      // Check if we need to retry - separate from logging
      if (!products || products.length === 0) {
        if (isProductPage()) {
          console.log('No products found but this appears to be a product page. Will retry later.');
          scheduleRetry();
        } else {
          console.log('No products found (not on a product page)');
        }
      }
      
      return products;
    } catch (error) {
      console.error('Error extracting products:', error);
      scheduleRetry();
      return null;
    }
  } else {
    console.log('SocialSparrow API not found on this page');
    return null;
  }
}

// Function to check if current page should contain products
function isProductPage() {
  const url = window.location.href;
  
  // Common product page indicators in URL
  const commonProductIndicators = [
    '/products/', 
    '/product/', 
    '/search', 
    '/browse', 
    '/shop/',
    '/grocery/',
    '/category/',
    '/department/',
    '/items/',
    '/filter'
  ];
  
  // Check for generic product indicators in URL
  if (commonProductIndicators.some(indicator => url.includes(indicator))) {
    return true;
  }
  
  // Generic product selectors that work across many sites
  const productSelectors = [
    // Generic selectors - will work across many sites
    '.product-tile',
    '.product-card',
    '.product-item',
    '.product-container',
    '.product-grid-item',
    '.product-list-item',
    '.product',
    '.item-product',
    '.grid-product',
    '.catalog-product',
    '[data-product-id]',
    '[data-item-id]',
    '[data-testid*="product"]',
    '[class*="product"]',
    '[class*="Product"]'
  ];

  // If any of the product selectors is found, consider it a product page
  return productSelectors.some(selector => document.querySelector(selector) !== null);
}

// Retry extraction with backoff
let retryCount = 0;
const maxRetries = 5;

function scheduleRetry() {
  if (retryCount < maxRetries) {
    retryCount++;
    const delay = 1000 * retryCount; // Increasing delay with each retry
    console.log(`Scheduling retry #${retryCount} in ${delay}ms`);
    
    setTimeout(() => {
      console.log(`Retry #${retryCount} extracting products...`);
      extractProductsFromPage();
    }, delay);
  } else {
    console.log('Maximum retries reached. Unable to extract products.');
  }
}

// Initial extraction with delay
setTimeout(() => {
  console.log('AstuteAnaconda Product Extractor: Initial extraction');
  extractProductsFromPage();
}, 2000); // Use a consistent 2 second delay for all sites

// Reset retry counter on new page
window.addEventListener('beforeunload', () => {
  retryCount = 0;
});

// Track URL changes for single-page applications
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('Page navigation detected, waiting for content to load...');
    retryCount = 0; // Reset retry counter on navigation
    
    // Wait a bit for the new page content to load
    setTimeout(() => {
      console.log('Extracting products after navigation');
      extractProductsFromPage();
    }, 2000);
  }
}).observe(document, {subtree: true, childList: true});
