// Function to extract products
function extractProductsFromPage() {
  console.log('Checking for SocialSparrow API...');
  
  // Check if SocialSparrow is available
  if (typeof SocialSparrow !== 'undefined') {
    console.log('SocialSparrow API detected on page');
    
    try {
      // Extract products
      const products = SocialSparrow.extractProducts();
      
      // Log products as table
      console.log('Products extracted from page:');
      console.table(products);
      
      return products;
    } catch (error) {
      console.error('Error extracting products:', error);
    }
  } else {
    console.log('SocialSparrow API not found on this page');
  }
  
  return null;
}

// Initial extraction with delay to ensure page is loaded
setTimeout(() => {
  console.log('AstuteAnaconda Product Extractor: Initial extraction');
  extractProductsFromPage();
}, 1500);

// Track URL changes for single-page applications
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('Page navigation detected, waiting for content to load...');
    
    // Wait a bit for the new page content to load
    setTimeout(() => {
      console.log('Extracting products after navigation');
      extractProductsFromPage();
    }, 2000);
  }
}).observe(document, {subtree: true, childList: true});
