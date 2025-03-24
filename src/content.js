// Function to extract products
function extractProductsFromPage() {
  console.log('DEBUGGING: Starting extractProductsFromPage function');
  console.log('Checking for SocialSparrow API...');
  
  // Check if SocialSparrow is available
  if (typeof window.SocialSparrow === 'undefined') {
    console.error('SocialSparrow API not found on this page');
    return null;
  }
  
  console.log('DEBUGGING: SocialSparrow API detected on page');
  console.log('SocialSparrow API object keys:', Object.keys(window.SocialSparrow));
  console.log('SocialSparrow API methods:', 
    Object.getOwnPropertyNames(window.SocialSparrow).filter(prop => 
      typeof window.SocialSparrow[prop] === 'function'
    )
  );
  
  try {
    // Check if extractProducts method exists
    if (typeof window.SocialSparrow.extractProducts !== 'function') {
      console.error('DEBUGGING: SocialSparrow.extractProducts is not a function');
      return null;
    }
    
    console.log('DEBUGGING: Calling SocialSparrow.extractProducts()');
    // Extract products using SocialSparrow API
    const products = window.SocialSparrow.extractProducts();
    console.log('DEBUGGING: extractProducts() returned:', products);
    
    // Log the current site
    console.log(`Current site: ${window.location.hostname}`);
    
    // Check if products is undefined or null
    if (products === undefined || products === null) {
      console.error('DEBUGGING: SocialSparrow.extractProducts() returned undefined or null');
      return [];
    }
    
    // Log the product return type for debugging
    console.log(`DEBUGGING: Product return type: ${typeof products}`);
    
    // Handle the case where products is an object but not an array
    let productArray = [];
    if (typeof products === 'object' && !Array.isArray(products)) {
      console.log('DEBUGGING: Product is an object, not an array');
      console.log('DEBUGGING: Object keys:', Object.keys(products));
      
      if (products.items && Array.isArray(products.items)) {
        // Try to get products from an "items" property
        productArray = products.items;
        console.log("DEBUGGING: Found products in items property");
      } else if (products.products && Array.isArray(products.products)) {
        // Try to get products from a "products" property
        productArray = products.products;
        console.log("DEBUGGING: Found products in products property");
      } else {
        // Try to convert the object to an array if it has numeric keys
        const keys = Object.keys(products);
        if (keys.length > 0 && keys.every(k => !isNaN(parseInt(k)))) {
          productArray = Object.values(products);
          console.log("DEBUGGING: Converted object with numeric keys to array");
        } else {
          // Last resort: check each property to see if it looks like a product
          for (const key in products) {
            if (typeof products[key] === 'object' && products[key] !== null) {
              productArray.push(products[key]);
              console.log(`DEBUGGING: Added object property ${key} to products array`);
            }
          }
          console.log("DEBUGGING: Extracted potential product objects from properties");
        }
      }
    } else if (Array.isArray(products)) {
      console.log('DEBUGGING: Products is already an array');
      productArray = products;
    }
    
    // Log the number of products found
    console.log(`DEBUGGING: Found ${productArray.length} product elements`);
    
    if (productArray.length > 0) {
      // Log the products directly
      console.log('DEBUGGING: Products extracted from page:');
      console.table(productArray);
      console.log(`DEBUGGING: Total products found: ${productArray.length}`);
    } else {
      console.log('DEBUGGING: No products found (empty array returned)');
    }
    
    return productArray;
  } catch (error) {
    console.error('DEBUGGING: Error extracting products:', error);
    console.error('DEBUGGING: Error stack:', error.stack);
    return [];
  }
}

// Add this function to check and wait for SocialSparrow to load
function waitForSocialSparrow(maxAttempts = 10, interval = 1000) {
  console.log('DEBUGGING: Starting waitForSocialSparrow');
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkSocialSparrow = () => {
      attempts++;
      console.log(`DEBUGGING: Checking for SocialSparrow (attempt ${attempts}/${maxAttempts})...`);
      
      if (typeof window.SocialSparrow !== 'undefined') {
        console.log('DEBUGGING: SocialSparrow API loaded successfully');
        resolve(window.SocialSparrow);
      } else if (attempts >= maxAttempts) {
        console.error('DEBUGGING: SocialSparrow API failed to load after maximum attempts');
        reject(new Error('SocialSparrow API not available'));
      } else {
        console.log(`DEBUGGING: SocialSparrow not found yet, trying again in ${interval}ms`);
        setTimeout(checkSocialSparrow, interval);
      }
    };
    
    checkSocialSparrow();
  });
}

// Initial extraction with retry mechanism
console.log('DEBUGGING: Content script loaded, setting up initial extraction');
setTimeout(() => {
  console.log('DEBUGGING: Starting initial extraction');
  waitForSocialSparrow()
    .then((socialSparrow) => {
      console.log('DEBUGGING: SocialSparrow found, calling extractProductsFromPage');
      return extractProductsFromPage();
    })
    .catch(error => {
      console.error('DEBUGGING: Failed to load SocialSparrow:', error);
    });
}, 1000);

// Track URL changes for single-page applications
console.log('DEBUGGING: Setting up MutationObserver for URL changes');
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('DEBUGGING: Page navigation detected, waiting for content to load...');
    
    // Wait a bit for the new page content to load
    setTimeout(() => {
      console.log('DEBUGGING: Extracting products after navigation');
      waitForSocialSparrow()
        .then(() => extractProductsFromPage())
        .catch(error => console.error('DEBUGGING: Failed to load SocialSparrow after navigation:', error));
    }, 2000);
  }
}).observe(document, {subtree: true, childList: true});

console.log('DEBUGGING: Content script initialization complete');
