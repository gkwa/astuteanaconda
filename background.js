// background.js - Service Worker for AstuteAnaconda
console.log("AstuteAnaconda Service Worker initialized")

// Keep track of active tabs with product pages
const productTabs = new Map()

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "REGISTER_PRODUCT_PAGE") {
    console.log("Registering product page for tab:", sender.tab.id)
    productTabs.set(sender.tab.id, {
      url: sender.tab.url,
      lastUpdated: Date.now(),
    })
    sendResponse({ success: true })
    return true
  }

  if (message.type === "EXTRACT_PRODUCTS_BACKGROUND") {
    console.log("Background extraction requested for tab:", sender.tab.id)

    // Use the fetch API with keepalive flag to ensure the request completes
    // even if the page loses focus
    if (message.endpoint) {
      fetch(message.endpoint, {
        method: message.method || "GET",
        headers: message.headers || { "Content-Type": "application/json" },
        keepalive: true,
        body: message.body ? JSON.stringify(message.body) : undefined,
      })
        .then((response) => response.json())
        .then((data) => {
          // Store the result in the service worker
          console.log("Background fetch successful:", data)
          chrome.tabs
            .sendMessage(sender.tab.id, {
              type: "BACKGROUND_FETCH_RESULT",
              data: data,
            })
            .catch((err) => console.error("Error sending fetch result to tab:", err))
        })
        .catch((error) => {
          console.error("Background fetch error:", error)
        })

      // Send immediate response to unblock the content script
      sendResponse({ success: true, status: "fetch_initiated" })
    } else {
      // If no endpoint is provided, execute a content script function
      chrome.scripting
        .executeScript({
          target: { tabId: sender.tab.id },
          function: () => {
            // This runs in the context of the tab
            console.log("DEBUGGING: Background extraction script running")

            // Try to get products if SocialSparrow is available
            if (
              window.SocialSparrow &&
              typeof window.SocialSparrow.extractProducts === "function"
            ) {
              try {
                const products = window.SocialSparrow.extractProducts()
                console.log("DEBUGGING: Background extraction successful:", products)
                // Store in a global variable for later access when tab gets focus
                window._backgroundExtractedProducts = products
                return products
              } catch (err) {
                console.error("DEBUGGING: Background extraction error:", err)
                return null
              }
            }
            return null
          },
        })
        .then((results) => {
          console.log("Background script execution results:", results)
          sendResponse({ success: true, results: results })
        })
        .catch((err) => {
          console.error("Background script execution error:", err)
          sendResponse({ success: false, error: err.message })
        })

      // Keep the message channel open for the async response
      return true
    }
  }

  return false
})

// Set up periodic polling for registered product pages
setInterval(() => {
  console.log("Running periodic background check for product pages")

  productTabs.forEach((tabInfo, tabId) => {
    // Check if we haven't updated in a while (e.g., 30 seconds)
    const timeSinceUpdate = Date.now() - tabInfo.lastUpdated
    if (timeSinceUpdate > 30000) {
      console.log(`Refreshing data for tab ${tabId}, last updated ${timeSinceUpdate}ms ago`)

      // Run our extraction script in the tab context
      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          function: () => {
            console.log("DEBUGGING: Periodic background extraction running")

            if (
              window.SocialSparrow &&
              typeof window.SocialSparrow.extractProducts === "function"
            ) {
              try {
                const products = window.SocialSparrow.extractProducts()
                console.log("DEBUGGING: Periodic extraction successful:", products)
                window._backgroundExtractedProducts = products
                return products
              } catch (err) {
                console.error("DEBUGGING: Periodic extraction error:", err)
                return null
              }
            }
            return null
          },
        })
        .then((results) => {
          console.log("Periodic extraction results for tab", tabId, ":", results)
          // Update the last updated timestamp
          if (productTabs.has(tabId)) {
            productTabs.set(tabId, {
              ...tabInfo,
              lastUpdated: Date.now(),
            })
          }
        })
        .catch((err) => {
          console.error("Error during periodic extraction for tab", tabId, ":", err)
        })
    }
  })
}, 60000) // Check every minute

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (productTabs.has(tabId)) {
    console.log("Removing closed tab from product tabs registry:", tabId)
    productTabs.delete(tabId)
  }
})
