// This script will be loaded by content-script.js and will run in the page context

// Set up global functions for the page to use
window.saveToDynamoDB = async function (products) {
  // Post a message to the content script
  window.postMessage(
    {
      type: "SAVE_TO_DYNAMODB",
      products: products,
    },
    "*",
  )

  // Return a promise that will be resolved when the save is complete
  return new Promise((resolve, reject) => {
    // Listen for the response
    const listener = (event) => {
      if (event.data.type === "SAVE_TO_DYNAMODB_RESPONSE") {
        window.removeEventListener("message", listener)

        if (event.data.success) {
          resolve(event.data.result)
        } else {
          reject(new Error(event.data.error))
        }
      }
    }

    window.addEventListener("message", listener)
  })
}

window.testAWSConnectivity = async function () {
  // Post a message to the content script
  window.postMessage(
    {
      type: "TEST_AWS_CONNECTIVITY",
    },
    "*",
  )

  // Return a promise that will be resolved when the test is complete
  return new Promise((resolve, reject) => {
    // Listen for the response
    const listener = (event) => {
      if (event.data.type === "TEST_AWS_CONNECTIVITY_RESPONSE") {
        window.removeEventListener("message", listener)

        if (event.data.success) {
          resolve(event.data.result)
        } else {
          reject(new Error(event.data.error))
        }
      }
    }

    window.addEventListener("message", listener)
  })
}

// Let the page know that our API is ready
window.dispatchEvent(new CustomEvent("SOCIALSPARROW_API_READY"))
