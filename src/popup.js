document.addEventListener('DOMContentLoaded', function() {
  const extractBtn = document.getElementById('extractBtn');
  
  extractBtn.addEventListener('click', async function() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractProducts
    });
  });
});

function extractProducts() {
  // Check if SocialSparrow is available
  if (typeof SocialSparrow === 'undefined') {
    console.error('SocialSparrow is not available on this page.');
    return;
  }
  
  try {
    // Extract products using SocialSparrow API
    const products = SocialSparrow.extractProducts();
    
    // Log products directly
    console.log('Products from SocialSparrow API:');
    console.table(products);
    
    // Optionally copy to clipboard as well
    SocialSparrow.extractProductsToClipboard()
      .then(data => console.log("Products copied to clipboard:", data))
      .catch(error => console.error("Error copying to clipboard:", error));
  } catch (error) {
    console.error("Error extracting products:", error);
  }
}
