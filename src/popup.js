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

    // Extract products using SocialSparrow API
    const products = window.SocialSparrow.extractProducts()

    // Check if products is undefined or null
    if (products === undefined || products === null) {
      console.error("SocialSparrow.extractProducts() returned undefined or null")
      return
    }

    // Log products directly
    console.log("Products from SocialSparrow API:")
    console.table(products)

    // Optionally copy to clipboard as well
    if (typeof window.SocialSparrow.extractProductsToClipboard === "function") {
      window.SocialSparrow.extractProductsToClipboard()
        .then((data) => console.log("Products copied to clipboard:", data))
        .catch((error) => console.error("Error copying to clipboard:", error))
    } else {
      console.error("SocialSparrow.extractProductsToClipboard is not a function")
    }
  } catch (error) {
    console.error("Error extracting products:", error)
  }
}
