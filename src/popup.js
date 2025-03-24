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
  
  // Check if SocialSparrow is available
  if (typeof window.SocialSparrow === "undefined") {
    console.error("SocialSparrow is not available on this page.")
    return
  }

  try {
    // Check if extractProducts method exists
    if (typeof window.SocialSparrow.extractProducts !== "function") {
      console.error("SocialSparrow.extractProducts is not a function")
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
      return
    }

    // Handle different product formats
    let processedProducts = products;
    
    // Handle Trader Joe's site
    if (window.location.hostname.includes("traderjoes")) {
      console.log("DEBUGGING: Detected Trader Joe's site")
      if (products.products && Array.isArray(products.products)) {
        processedProducts = products.products
        console.log(`DEBUGGING: Found ${processedProducts.length} products in Trader Joe's format`)
      }
    }
    
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
    if (typeof window.SocialSparrow.extractProductsToClipboard === "function") {
      console.log("DEBUGGING: Calling extractProductsToClipboard")
      window.SocialSparrow.extractProductsToClipboard()
        .then((data) => console.log("Products copied to clipboard:", data))
        .catch((error) => console.error("Error copying to clipboard:", error))
    } else {
      console.error("SocialSparrow.extractProductsToClipboard is not a function")
    }
  } catch (error) {
    console.error("Error extracting products:", error)
    alert("Error extracting products. Check the console for details.")
  }
}
