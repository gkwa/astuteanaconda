import { saveProductsToDynamoDB } from "../api.js"

// Function to attempt to intercept API responses
export function setupNetworkInterceptor() {
  console.log("DEBUGGING: Setting up network interceptor")

  const originalFetch = window.fetch
  window.fetch = async function (...args) {
    const response = await originalFetch(...args)

    const clone = response.clone()
    const url = args[0] instanceof Request ? args[0].url : args[0]

    if (url.includes("product") || url.includes("search") || url.includes("api")) {
      try {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          clone
            .json()
            .then((data) => {
              console.log(`DEBUGGING: Intercepted API response from ${url}:`, data)

              if (data && (data.products || data.items)) {
                console.log("DEBUGGING: Found potential product data in API response")
                window._interceptedProductData = data

                const productsData = data.products || data.items
                if (Array.isArray(productsData) && productsData.length > 0) {
                  console.log("DEBUGGING: Saving intercepted products to DynamoDB")
                  saveProductsToDynamoDB(productsData)
                    .then((result) => {
                      console.log("DEBUGGING: Intercepted products saved to DynamoDB:", result)
                    })
                    .catch((error) => {
                      console.error(
                        "DEBUGGING: Error saving intercepted products to DynamoDB:",
                        error,
                      )
                    })
                }
              }
            })
            .catch((err) => {
              console.log(`DEBUGGING: Error parsing intercepted JSON:`, err)
            })
        }
      } catch (err) {
        console.log("DEBUGGING: Error in fetch interceptor:", err)
      }
    }

    return response
  }

  const originalXHROpen = XMLHttpRequest.prototype.open
  const originalXHRSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (...args) {
    this._url = args[1]
    return originalXHROpen.apply(this, args)
  }

  XMLHttpRequest.prototype.send = function (...args) {
    const xhr = this
    const originalOnReadyStateChange = xhr.onreadystatechange

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const url = xhr._url
        if (url && (url.includes("product") || url.includes("search") || url.includes("api"))) {
          try {
            const contentType = xhr.getResponseHeader("content-type")
            if (contentType && contentType.includes("application/json")) {
              const data = JSON.parse(xhr.responseText)
              console.log(`DEBUGGING: Intercepted XHR response from ${url}:`, data)

              if (data && (data.products || data.items)) {
                console.log("DEBUGGING: Found potential product data in XHR response")
                window._interceptedXHRData = data

                const productsData = data.products || data.items
                if (Array.isArray(productsData) && productsData.length > 0) {
                  console.log("DEBUGGING: Saving XHR intercepted products to DynamoDB")
                  saveProductsToDynamoDB(productsData)
                    .then((result) => {
                      console.log("DEBUGGING: XHR intercepted products saved to DynamoDB:", result)
                    })
                    .catch((error) => {
                      console.error(
                        "DEBUGGING: Error saving XHR intercepted products to DynamoDB:",
                        error,
                      )
                    })
                }
              }
            }
          } catch (err) {
            console.log("DEBUGGING: Error parsing XHR JSON:", err)
          }
        }
      }

      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(xhr, arguments)
      }
    }

    return originalXHRSend.apply(xhr, args)
  }

  console.log("DEBUGGING: Network interceptors set up successfully")
}
