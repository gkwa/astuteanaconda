// Direct injection script that will run in the page context
function injectSaveToDynamoDB() {
  // Create a function in the page context that will be called from the content script
  window.saveToDynamoDB = async function(products) {
    // Post a message to the content script
    window.postMessage({
      type: "SAVE_TO_DYNAMODB",
      products: products
    }, "*");
    
    // Return a promise that will be resolved when the save is complete
    return new Promise((resolve, reject) => {
      // Listen for the response
      const listener = event => {
        if (event.data.type === "SAVE_TO_DYNAMODB_RESPONSE") {
          window.removeEventListener("message", listener);
          
          if (event.data.success) {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error));
          }
        }
      };
      
      window.addEventListener("message", listener);
    });
  };
  
  // Also inject testAWSConnectivity
  window.testAWSConnectivity = async function() {
    // Post a message to the content script
    window.postMessage({
      type: "TEST_AWS_CONNECTIVITY",
    }, "*");
    
    // Return a promise that will be resolved when the test is complete
    return new Promise((resolve, reject) => {
      // Listen for the response
      const listener = event => {
        if (event.data.type === "TEST_AWS_CONNECTIVITY_RESPONSE") {
          window.removeEventListener("message", listener);
          
          if (event.data.success) {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error));
          }
        }
      };
      
      window.addEventListener("message", listener);
    });
  };
}

// Create a script element to inject our code
const scriptElement = document.createElement('script');
scriptElement.textContent = `(${injectSaveToDynamoDB.toString()})();`;
document.documentElement.appendChild(scriptElement);
document.documentElement.removeChild(scriptElement);

// Listen for messages from the injected script
window.addEventListener("message", async function(event) {
  // Check if the message is from our injected script
  if (event.data.type === "SAVE_TO_DYNAMODB") {
    try {
      // Import dynamically to avoid module issues in content scripts
      const { saveProductsToDynamoDB } = await import('./api.js');
      
      // Save the products
      const result = await saveProductsToDynamoDB(event.data.products);
      
      // Send the response back
      window.postMessage({
        type: "SAVE_TO_DYNAMODB_RESPONSE",
        success: true,
        result: result
      }, "*");
    } catch (error) {
      // Send the error back
      window.postMessage({
        type: "SAVE_TO_DYNAMODB_RESPONSE",
        success: false,
        error: error.message
      }, "*");
    }
  } else if (event.data.type === "TEST_AWS_CONNECTIVITY") {
    try {
      // Import dynamically to avoid module issues in content scripts
      const { testAWSConnectivity } = await import('./api.js');
      
      // Test connectivity
      const result = await testAWSConnectivity();
      
      // Send the response back
      window.postMessage({
        type: "TEST_AWS_CONNECTIVITY_RESPONSE",
        success: true,
        result: result
      }, "*");
    } catch (error) {
      // Send the error back
      window.postMessage({
        type: "TEST_AWS_CONNECTIVITY_RESPONSE",
        success: false,
        error: error.message
      }, "*");
    }
  }
});

// Now import the main content script
import './content.js';
