/**
* Service responsible for product extraction operations
* Following the Single Responsibility Principle
*/
import { saveProductsToDynamoDB } from "../api.js";
import { debug, error } from "../utils/logger.js";

/**
* ProductExtractionService - Handles all product extraction operations
* This follows the Single Responsibility Principle by focusing only on extraction
*/
class ProductExtractionService {
 constructor() {
   this.socialSparrowAvailable = false;
 }

 /**
  * Checks if SocialSparrow API is available
  * @returns {boolean} Whether SocialSparrow is available
  */
 checkSocialSparrowAvailability() {
   this.socialSparrowAvailable = typeof window.SocialSparrow !== "undefined" && 
                                typeof window.SocialSparrow.extractProducts === "function";
   debug(`SocialSparrow availability check: ${this.socialSparrowAvailable}`);
   return this.socialSparrowAvailable;
 }

 /**
  * Wait for SocialSparrow to become available
  * @param {number} maxAttempts - Maximum number of attempts to check
  * @param {number} interval - Interval between checks in milliseconds
  * @returns {Promise<object>} - Promise resolving to SocialSparrow object
  */
 waitForSocialSparrow(maxAttempts = 15, interval = 1000) {
   debug("Starting waitForSocialSparrow");
   return new Promise((resolve, reject) => {
     let attempts = 0;

     const checkSocialSparrow = () => {
       attempts++;
       debug(`Checking for SocialSparrow (attempt ${attempts}/${maxAttempts})...`);

       if (typeof window.SocialSparrow !== "undefined") {
         debug("SocialSparrow API loaded successfully");

         if (typeof window.SocialSparrow.extractProducts === "function") {
           debug("SocialSparrow API methods ready");
           this.socialSparrowAvailable = true;
           setTimeout(() => resolve(window.SocialSparrow), 500);
         } else {
           debug("SocialSparrow API found but methods not ready yet");
           if (attempts >= maxAttempts) {
             this.socialSparrowAvailable = false;
             reject(new Error("SocialSparrow API methods not available after maximum attempts"));
           } else {
             setTimeout(checkSocialSparrow, interval);
           }
         }
       } else if (attempts >= maxAttempts) {
         error("SocialSparrow API failed to load after maximum attempts");
         this.socialSparrowAvailable = false;
         reject(new Error("SocialSparrow API not available"));
       } else {
         debug(`SocialSparrow not found yet, trying again in ${interval}ms`);
         setTimeout(checkSocialSparrow, interval);
       }
     };

     checkSocialSparrow();
   });
 }

 /**
  * Extract products from the page
  * @returns {Promise<Array>} - Promise resolving to array of products
  */
 async extractProducts() {
   debug("Starting product extraction process");
   
   let products = [];
   
   try {
     // Ensure SocialSparrow is available
     if (!this.socialSparrowAvailable) {
       await this.waitForSocialSparrow();
     }
     
     // Extract products using SocialSparrow
     debug("Extracting products using SocialSparrow API");
     products = window.SocialSparrow.extractProducts();
     
     // Save the products if any were found
     if (products.length > 0) {
       debug(`Total products found: ${products.length}`);
       console.table(products);
       
       debug("Saving products to DynamoDB");
       try {
         const result = await saveProductsToDynamoDB(products);
         debug("Products saved to DynamoDB:", result);
       } catch (dbError) {
         error("Error saving products to DynamoDB:", dbError);
       }
     } else {
       debug("No products found");
     }
     
     return products;
   } catch (err) {
     error("Error in product extraction process:", err);
     return [];
   }
 }
}

// Export a singleton instance
export const productExtractor = new ProductExtractionService();
