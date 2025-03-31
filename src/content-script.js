import { productExtractor } from "./services/product-extraction-service.js";
import { testAWSConnectivity } from "./api.js";
import { debug, error } from "./utils/logger.js";

// Initialize everything
function init() {
 // Test AWS connectivity on startup
 debug("Testing AWS connectivity...");
 testAWSConnectivity()
   .then((result) => {
     debug("AWS connectivity test result:", result);
   })
   .catch((error) => {
     error("AWS connectivity test error:", error);
   });

 // Initial extraction with retry mechanism
 debug("Content script loaded, setting up initial extraction");
 setTimeout(() => {
   debug("Starting initial extraction");
   productExtractor.extractProducts()
     .then(products => {
       debug(`Initial extraction complete, found ${products.length} products`);
     })
     .catch(err => {
       error("Error during initial extraction:", err);
     });
 }, 2000);

 // Track URL changes for single-page applications
 debug("Setting up MutationObserver for URL changes");
 let lastUrl = location.href;
 new MutationObserver(() => {
   const url = location.href;
   if (url !== lastUrl) {
     lastUrl = url;
     debug("Page navigation detected, waiting for content to load...");

     // Wait a bit for the new page content to load
     setTimeout(() => {
       debug("Extracting products after navigation");
       productExtractor.extractProducts()
         .then(products => {
           debug(`Post-navigation extraction complete, found ${products.length} products`);
         })
         .catch(err => {
           error("Error during post-navigation extraction:", err);
         });
     }, 3000);
   }
 }).observe(document, { subtree: true, childList: true });

 debug("Content script initialization complete");
}

// Set up message passing for communication between content script and page
window.addEventListener("message", async function (event) {
 // Only respond to messages from our page
 if (event.source !== window) return

 // Check if the message is from our page script
 if (event.data.type === "SAVE_TO_DYNAMODB") {
   try {
     // Import dynamically to avoid module issues in content scripts
     const { saveProductsToDynamoDB } = await import("./api.js")

     // Save the products
     const result = await saveProductsToDynamoDB(event.data.products)

     // Send the response back
     window.postMessage(
       {
         type: "SAVE_TO_DYNAMODB_RESPONSE",
         success: true,
         result: result,
       },
       "*",
     )
   } catch (error) {
     // Send the error back
     window.postMessage(
       {
         type: "SAVE_TO_DYNAMODB_RESPONSE",
         success: false,
         error: error.message,
       },
       "*",
     )
   }
 } else if (event.data.type === "TEST_AWS_CONNECTIVITY") {
   try {
     // Import dynamically to avoid module issues in content scripts
     const { testAWSConnectivity } = await import("./api.js")

     // Test connectivity
     const result = await testAWSConnectivity()

     // Send the response back
     window.postMessage(
       {
         type: "TEST_AWS_CONNECTIVITY_RESPONSE",
         success: true,
         result: result,
       },
       "*",
     )
   } catch (error) {
     // Send the error back
     window.postMessage(
       {
         type: "TEST_AWS_CONNECTIVITY_RESPONSE",
         success: false,
         error: error.message,
       },
       "*",
     )
   }
 }
})

// Expose the init function to the page
window.addEventListener("DOMContentLoaded", () => {
 // Add a <script> tag to the page that sets up message passing
 const script = document.createElement("script")
 script.src = chrome.runtime.getURL("page-script.bundle.js")
 ;(document.head || document.documentElement).appendChild(script)
 script.onload = () => script.remove()
 
 // Initialize the content script
 init()
})

