// Wait for page to fully load
window.addEventListener('load', function() {
  console.log('AstuteAnaconda Product Extractor: Page loaded');
  
  // Add a small delay to ensure any dynamic content has loaded
  setTimeout(() => {
    // Check if SocialSparrow is available
    if (typeof SocialSparrow !== 'undefined') {
      console.log('SocialSparrow API detected on page');
      
      try {
        // Extract products
        const products = SocialSparrow.extractProducts();
        
        // Log products as table
        console.log('Products extracted from page:');
        console.table(products);
      } catch (error) {
        console.error('Error extracting products:', error);
      }
    } else {
      console.log('SocialSparrow API not found on this page');
    }
  }, 1500); // 1.5 second delay
});

// Listen for page state updates (for single-page applications)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('Page navigation detected, waiting for content to load...');
    
    // Wait a bit for the new page content to load
    setTimeout(() => {
      if (typeof SocialSparrow !== 'undefined') {
        try {
          const products = SocialSparrow.extractProducts();
          console.log('Products extracted after page navigation:');
          console.table(products);
        } catch (error) {
          console.error('Error extracting products after navigation:', error);
        }
      }
    }, 2000);
  }
}).observe(document, {subtree: true, childList: true});
