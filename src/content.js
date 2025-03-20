// Function to extract products
function extractProductsFromPage() {
  console.log('Checking for SocialSparrow API...');
  
  // Check if SocialSparrow is available
  if (typeof SocialSparrow !== 'undefined') {
    console.log('SocialSparrow API detected on page');
    
    try {
      // Extract products
      const products = SocialSparrow.extractProducts();
      
      // Always log the products array and directly use console.table
      console.log('Products extracted from page:');
      
      // Create a flattened version of the products for better table display
      const flattenedProducts = products.map(product => ({
        name: product.name || 'N/A',
        brand: product.brand || 'N/A',
        price: product.price || 'N/A',
        url: product.url || 'N/A'
      }));
      
      console.table(flattenedProducts);
      
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
  
  // QFC product pages
  if (url.includes('qfc.com') && (
      url.includes('/search?') || 
      url.includes('/shop/') || 
      document.querySelector('[data-testid^="product-card-"]')
  )) {
    return true;
  }
  
  // Whole Foods product pages
  if (url.includes('wholefoodsmarket.com') && (
      url.includes('/search?') || 
      url.includes('/products/') ||
      document.querySelector('.w-pie--product-tile')
  )) {
    return true;
  }
  
  // Walmart product pages
  if (url.includes('walmart.com') && (
      url.includes('/search?') || 
      url.includes('/browse/') ||
      document.querySelector('[data-automation-id="product-title"]')
  )) {
    return true;
  }
  
  return false;
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

// Determine initial delay based on site
function getInitialDelay() {
  const url = window.location.href;
  
  // QFC seems to need more time to load
  if (url.includes('qfc.com')) {
    return 3000; // 3 seconds for QFC
  }
  
  // Default delay for other sites
  return 1500;
}

// Initial extraction with site-specific delay
setTimeout(() => {
  console.log('AstuteAnaconda Product Extractor: Initial extraction');
  extractProductsFromPage();
}, getInitialDelay());

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
    }, getInitialDelay());
  }
}).observe(document, {subtree: true, childList: true});
