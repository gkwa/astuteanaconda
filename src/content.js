// Function to extract products
function extractProductsFromPage() {
  console.log('Checking for SocialSparrow API...');
  
  // Check if SocialSparrow is available
  if (typeof SocialSparrow !== 'undefined') {
    console.log('SocialSparrow API detected on page');
    
    try {
      // Extract products using SocialSparrow API
      const products = SocialSparrow.extractProducts();
      
      // Log the current site
      console.log(`Current site: ${window.location.hostname}`);
      
      // Log the number of products found
      console.log(`Found ${products ? products.length : 0} product elements`);
      
      if (products && products.length > 0) {
        // Log the products directly
        console.log('Products extracted from page:');
        console.table(products);
        console.log(`Total products found: ${products.length}`);
      } else {
        console.log('No products found or empty array returned');
      }
      
      return products;
    } catch (error) {
      console.error('Error extracting products:', error);
      return null;
    }
  } else {
    console.log('SocialSparrow API not found on this page');
    return null;
  }
}

// Initial extraction with delay
setTimeout(() => {
  console.log('AstuteAnaconda Product Extractor: Initial extraction');
  extractProductsFromPage();
}, 2000); // Use a consistent 2 second delay for all sites

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

