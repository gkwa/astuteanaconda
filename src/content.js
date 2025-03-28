// Content script using IIFE pattern to avoid module import issues
(function() {
  // AWS credentials functions
  async function getAWSCredentials() {
    return new Promise((resolve, reject) => {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["aws_access_key_id", "aws_secret_access_key"], function (result) {
          if (result.aws_access_key_id && result.aws_secret_access_key) {
            // Return credentials from storage
            resolve({
              accessKeyId: result.aws_access_key_id,
              secretAccessKey: result.aws_secret_access_key,
            });
          } else {
            reject(
              new Error("AWS credentials not found. Please configure them in the extension options.")
            );
          }
        });
      } else {
        reject(new Error("Chrome storage not available"));
      }
    });
  }
  
  // AWS Signature functions
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  function toHex(data) {
    return Array.from(data)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  async function hmacSha256(key, message) {
    const keyData = typeof key === 'string' 
      ? new TextEncoder().encode(key) 
      : key;
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const msgData = new TextEncoder().encode(message);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    
    return new Uint8Array(signature);
  }
  
  async function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = await hmacSha256('AWS4' + key, dateStamp);
    const kRegion = await hmacSha256(kDate, regionName);
    const kService = await hmacSha256(kRegion, serviceName);
    const kSigning = await hmacSha256(kService, 'aws4_request');
    return kSigning;
  }
  
  async function signRequest(method, host, region, service, body, accessKey, secretKey) {
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const canonicalHeaders = 
      'content-type:application/x-amz-json-1.0\n' +
      'host:' + host + '\n' +
      'x-amz-date:' + amzDate + '\n' +
      'x-amz-target:DynamoDB_20120810.BatchWriteItem\n';
    
    const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
    
    const payloadHash = await sha256(JSON.stringify(body));
    
    const canonicalRequest = method + '\n' +
      canonicalUri + '\n' +
      canonicalQueryString + '\n' +
      canonicalHeaders + '\n' +
      signedHeaders + '\n' +
      payloadHash;
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = dateStamp + '/' + region + '/' + service + '/aws4_request';
    const stringToSign = algorithm + '\n' +
      amzDate + '\n' +
      credentialScope + '\n' +
      await sha256(canonicalRequest);
    
    const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
    const signature = toHex(await hmacSha256(signingKey, stringToSign));
    
    const authorizationHeader = algorithm + ' ' +
      'Credential=' + accessKey + '/' + credentialScope + ', ' +
      'SignedHeaders=' + signedHeaders + ', ' +
      'Signature=' + signature;
    
    return {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Date': amzDate,
      'X-Amz-Target': 'DynamoDB_20120810.BatchWriteItem',
      'Authorization': authorizationHeader
    };
  }
  
  // DynamoDB Service Functions
  function generateTimestamp(productName) {
    const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    return `${now}#${productName}`;
  }
  
  function generateTTL() {
    return Math.floor(Date.now() / 1000) + 2592000; // Current time + 30 days in seconds
  }
  
  function transformProducts(products, domain) {
    const seenKeys = new Set();
    const transformedItems = [];
  
    if (!products || !Array.isArray(products) || products.length === 0) {
      console.error("No valid products array provided to transform");
      return [];
    }
  
    products.forEach((product) => {
      const productName = product.name || product.title || "Unknown Product";
      
      let category = "general";
      if (product.category) {
        category = product.category;
      } else if (product.tags && product.tags.length > 0) {
        category = product.tags[0];
      } else if (product.breadcrumbs && product.breadcrumbs.length > 0) {
        category = product.breadcrumbs[product.breadcrumbs.length - 1];
      }
  
      let baseTimestamp = generateTimestamp(productName);
      let timestamp = baseTimestamp;
      let counter = 1;
      
      while (seenKeys.has(`${category}:${timestamp}`)) {
        timestamp = `${baseTimestamp}#${counter}`;
        counter++;
      }
  
      seenKeys.add(`${category}:${timestamp}`);
  
      const dynamoItem = {
        PutRequest: {
          Item: {
            category: { S: category },
            timestamp: { S: timestamp },
            domain: { S: domain },
            ttl: { N: String(generateTTL()) },
            entity_type: { S: "category" },
            product: { M: {} }
          }
        }
      };
  
      const productMap = dynamoItem.PutRequest.Item.product.M;
      
      for (const [key, value] of Object.entries(product)) {
        if (["category", "timestamp", "domain", "ttl", "entity_type"].includes(key)) {
          continue;
        }
  
        if (value === null) {
          productMap[key] = { NULL: true };
        } else if (typeof value === "boolean") {
          productMap[key] = { BOOL: value };
        } else if (typeof value === "number") {
          productMap[key] = { N: String(value) };
        } else if (Array.isArray(value)) {
          productMap[key] = { S: JSON.stringify(value) };
        } else if (typeof value === "object") {
          productMap[key] = { S: JSON.stringify(value) };
        } else {
          productMap[key] = { S: String(value) };
        }
      }
  
      transformedItems.push(dynamoItem);
    });
  
    return transformedItems;
  }
  
  function chunkItems(items, chunkSize = 25) {
    return Array(Math.ceil(items.length / chunkSize))
      .fill()
      .map((_, index) => items.slice(index * chunkSize, (index + 1) * chunkSize));
  }
  
  function createBatchWriteRequest(items) {
    return {
      RequestItems: {
        dreamydungbeetle: items
      }
    };
  }
  
  async function saveProductsToDynamoDB(products) {
    try {
      const domain = window.location.hostname;
      
      const transformedItems = transformProducts(products, domain);
      console.log(`DEBUGGING: Transformed ${transformedItems.length} items for DynamoDB`);
      
      const chunks = chunkItems(transformedItems);
      console.log(`DEBUGGING: Split into ${chunks.length} chunks`);
      
      const credentials = await getAWSCredentials();
      
      const region = "us-east-1";
      const host = `dynamodb.${region}.amazonaws.com`;
      
      const results = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`DEBUGGING: Processing chunk ${i + 1} of ${chunks.length}...`);
        
        const batchRequest = createBatchWriteRequest(chunks[i]);
        
        const headers = await signRequest(
          "POST",
          host,
          region,
          "dynamodb",
          batchRequest,
          credentials.accessKeyId,
          credentials.secretAccessKey
        );
        
        const response = await fetch(`https://${host}`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(batchRequest)
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`AWS returned status code ${response.status}: ${errorText}`);
        }
  
        const result = await response.json();
        results.push(result);
        
        console.log(`DEBUGGING: Chunk ${i + 1} processed successfully`);
        
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log(`DEBUGGING: All ${chunks.length} chunks processed successfully`);
      return { success: true, results, count: transformedItems.length };
    } catch (error) {
      console.error("Error sending batch to DynamoDB:", error);
      throw error;
    }
  }
  
  async function testAWSConnectivity() {
    try {
      const testItem = {
        PutRequest: {
          Item: {
            category: { S: "test-category" },
            timestamp: { S: new Date().toISOString() },
            domain: { S: "test.example.com" },
            ttl: { N: String(Math.floor(Date.now() / 1000) + 3600) }, // 1 hour expiry
            entity_type: { S: "test" },
            product: { M: { name: { S: "Test Product" } } }
          }
        }
      };
      
      const credentials = await getAWSCredentials();
      
      const region = "us-east-1";
      const host = `dynamodb.${region}.amazonaws.com`;
      
      const batchRequest = createBatchWriteRequest([testItem]);
      
      const headers = await signRequest(
        "POST",
        host,
        region,
        "dynamodb",
        batchRequest,
        credentials.accessKeyId,
        credentials.secretAccessKey
      );
      
      const response = await fetch(`https://${host}`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(batchRequest)
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AWS returned status code ${response.status}: ${errorText}`);
      }
  
      await response.json();
      return { success: true, message: "DynamoDB connectivity test successful" };
    } catch (error) {
      console.error("DynamoDB connectivity test failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Function to extract products
  function extractProductsFromPage() {
    console.log("DEBUGGING: Starting extractProductsFromPage function");
    console.log("Checking for SocialSparrow API...");
    
    if (typeof window.SocialSparrow === "undefined") {
      console.error("SocialSparrow API not found on this page");
      return null;
    }
    
    console.log("DEBUGGING: SocialSparrow API detected on page");
    console.log("SocialSparrow API object keys:", Object.keys(window.SocialSparrow));
    console.log(
      "SocialSparrow API methods:",
      Object.getOwnPropertyNames(window.SocialSparrow).filter(
        (prop) => typeof window.SocialSparrow[prop] === "function",
      ),
    );
    
    try {
      if (typeof window.SocialSparrow.extractProducts !== "function") {
        console.error("DEBUGGING: SocialSparrow.extractProducts is not a function");
        return null;
      }
      
      console.log("DEBUGGING: Calling SocialSparrow.extractProducts()");
      const products = window.SocialSparrow.extractProducts();
      console.log("DEBUGGING: extractProducts() returned:", products);
      
      console.log("DEBUGGING: Full product JSON:", JSON.stringify(products, null, 2));
      console.log(`Current site: ${window.location.hostname}`);
      
      if (products === undefined || products === null) {
        console.error("DEBUGGING: SocialSparrow.extractProducts() returned undefined or null");
        return [];
      }
      
      console.log(`DEBUGGING: Product return type: ${typeof products}`);
      
      if (window._socialsparrow && window._socialsparrow.products) {
        console.log("DEBUGGING: Found products directly in window._socialsparrow.products");
        console.log(`DEBUGGING: Found ${window._socialsparrow.products.length} products`);
        return window._socialsparrow.products;
      }
      
      let productArray = [];
      if (typeof products === "object" && !Array.isArray(products)) {
        console.log("DEBUGGING: Product is an object, not an array");
        console.log("DEBUGGING: Object keys:", Object.keys(products));
        
        if (products.items && Array.isArray(products.items)) {
          productArray = products.items;
          console.log("DEBUGGING: Found products in items property");
        } else if (products.products && Array.isArray(products.products)) {
          productArray = products.products;
          console.log("DEBUGGING: Found products in products property");
        } else if (products.searchTerm && products.products) {
          productArray = products.products;
          console.log(
            `DEBUGGING: Found search results for "${products.searchTerm}" with ${productArray.length} products`,
          );
        } else {
          const keys = Object.keys(products);
          if (keys.length > 0 && keys.every((k) => !isNaN(parseInt(k)))) {
            productArray = Object.values(products);
            console.log("DEBUGGING: Converted object with numeric keys to array");
          } else {
            for (const key in products) {
              if (typeof products[key] === "object" && products[key] !== null) {
                if (products[key].name || products[key].title || products[key].productName) {
                  productArray.push(products[key]);
                  console.log(`DEBUGGING: Added object property ${key} to products array`);
                }
              }
            }
            console.log("DEBUGGING: Extracted potential product objects from properties");
          }
        }
      } else if (Array.isArray(products)) {
        console.log("DEBUGGING: Products is already an array");
        productArray = products;
      }
      
      console.log(`DEBUGGING: Found ${productArray.length} product elements`);
      
      if (productArray.length > 0) {
        console.log("DEBUGGING: Products extracted from page:");
        console.table(productArray);
        console.log(`DEBUGGING: Total products found: ${productArray.length}`);
        
        console.log("DEBUGGING: Saving products to DynamoDB");
        saveProductsToDynamoDB(productArray)
          .then(result => {
            console.log("DEBUGGING: Products saved to DynamoDB:", result);
          })
          .catch(error => {
            console.error("DEBUGGING: Error saving products to DynamoDB:", error);
          });
      } else {
        console.log("DEBUGGING: No products found (empty array returned)");
      }
      
      return productArray;
    } catch (error) {
      console.error("DEBUGGING: Error extracting products:", error);
      console.error("DEBUGGING: Error stack:", error.stack);
      return [];
    }
  }

  // Function to extract products from DOM as a fallback
  function extractProductsFromDOM() {
    console.log("DEBUGGING: Attempting to extract products from DOM elements");
    const products = [];
    
    try {
      const productContainers = document.querySelectorAll(
        '.product-grid, .products-grid, [data-test="product-grid"], [data-test="search-results"]',
      );
      
      if (productContainers.length === 0) {
        console.log("DEBUGGING: No product containers found in DOM");
        return [];
      }
      
      productContainers.forEach((container) => {
        const productElements = container.querySelectorAll(
          '.product, .product-card, [data-test="product-card"]',
        );
        console.log(`DEBUGGING: Found ${productElements.length} product elements in container`);
        
        productElements.forEach((productEl) => {
          try {
            const titleEl = productEl.querySelector(
              '.product-title, .product-name, [data-test="product-title"]',
            );
            const priceEl = productEl.querySelector('.product-price, [data-test="product-price"]');
            const imageEl = productEl.querySelector("img");
            
            const product = {
              name: titleEl ? titleEl.textContent.trim() : "",
              price: priceEl ? priceEl.textContent.trim() : "",
              imageUrl: imageEl ? imageEl.src : "",
              url: productEl.querySelector("a") ? productEl.querySelector("a").href : "",
            };
            
            if (product.name) {
              products.push(product);
            }
          } catch (err) {
            console.log("DEBUGGING: Error extracting individual product:", err);
          }
        });
      });
      
      if (products.length > 0) {
        console.log("DEBUGGING: Saving DOM-extracted products to DynamoDB");
        saveProductsToDynamoDB(products)
          .then(result => {
            console.log("DEBUGGING: DOM-extracted products saved to DynamoDB:", result);
          })
          .catch(error => {
            console.error("DEBUGGING: Error saving DOM-extracted products to DynamoDB:", error);
          });
      }
      
      return products;
    } catch (error) {
      console.error("DEBUGGING: Error in DOM extraction:", error);
      return [];
    }
  }

  // Function to attempt to intercept API responses
  function setupNetworkInterceptor() {
    console.log("DEBUGGING: Setting up network interceptor");
    
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch(...args);
      
      const clone = response.clone();
      const url = args[0] instanceof Request ? args[0].url : args[0];
      
      if (url.includes("product") || url.includes("search") || url.includes("api")) {
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            clone
              .json()
              .then((data) => {
                console.log(`DEBUGGING: Intercepted API response from ${url}:`, data);
                
                if (data && (data.products || data.items)) {
                  console.log("DEBUGGING: Found potential product data in API response");
                  window._interceptedProductData = data;
                  
                  const productsData = data.products || data.items;
                  if (Array.isArray(productsData) && productsData.length > 0) {
                    console.log("DEBUGGING: Saving intercepted products to DynamoDB");
                    saveProductsToDynamoDB(productsData)
                      .then(result => {
                        console.log("DEBUGGING: Intercepted products saved to DynamoDB:", result);
                      })
                      .catch(error => {
                        console.error("DEBUGGING: Error saving intercepted products to DynamoDB:", error);
                      });
                  }
                }
              })
              .catch((err) => {
                console.log(`DEBUGGING: Error parsing intercepted JSON:`, err);
              });
          }
        } catch (err) {
          console.log("DEBUGGING: Error in fetch interceptor:", err);
        }
      }
      
      return response;
    };
    
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function (...args) {
      this._url = args[1];
      return originalXHROpen.apply(this, args);
    };
    
    XMLHttpRequest.prototype.send = function (...args) {
      const xhr = this;
      const originalOnReadyStateChange = xhr.onreadystatechange;
      
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          const url = xhr._url;
          if (url && (url.includes("product") || url.includes("search") || url.includes("api"))) {
            try {
              const contentType = xhr.getResponseHeader("content-type");
              if (contentType && contentType.includes("application/json")) {
                const data = JSON.parse(xhr.responseText);
                console.log(`DEBUGGING: Intercepted XHR response from ${url}:`, data);
                
                if (data && (data.products || data.items)) {
                  console.log("DEBUGGING: Found potential product data in XHR response");
                  window._interceptedXHRData = data;
                  
                  const productsData = data.products || data.items;
                  if (Array.isArray(productsData) && productsData.length > 0) {
                    console.log("DEBUGGING: Saving XHR intercepted products to DynamoDB");
                    saveProductsToDynamoDB(productsData)
                      .then(result => {
                        console.log("DEBUGGING: XHR intercepted products saved to DynamoDB:", result);
                      })
                      .catch(error => {
                        console.error("DEBUGGING: Error saving XHR intercepted products to DynamoDB:", error);
                      });
                  }
                }
              }
            } catch (err) {
              console.log("DEBUGGING: Error parsing XHR JSON:", err);
            }
          }
        }
        
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(xhr, arguments);
        }
      };
      
      return originalXHRSend.apply(xhr, args);
    };
    
    console.log("DEBUGGING: Network interceptors set up successfully");
  }

  // Make functions available globally
  window.saveToDynamoDB = saveProductsToDynamoDB;
  window.testAWSConnectivity = testAWSConnectivity;

  // Function to wait for SocialSparrow
  function waitForSocialSparrow(maxAttempts = 15, interval = 1000) {
    console.log("DEBUGGING: Starting waitForSocialSparrow");
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const checkSocialSparrow = () => {
        attempts++;
        console.log(`DEBUGGING: Checking for SocialSparrow (attempt ${attempts}/${maxAttempts})...`);
        
        if (typeof window.SocialSparrow !== "undefined") {
          console.log("DEBUGGING: SocialSparrow API loaded successfully");
          
          if (typeof window.SocialSparrow.extractProducts === "function") {
            console.log("DEBUGGING: SocialSparrow API methods ready");
            setTimeout(() => resolve(window.SocialSparrow), 500);
          } else {
            console.log("DEBUGGING: SocialSparrow API found but methods not ready yet");
            if (attempts >= maxAttempts) {
              reject(new Error("SocialSparrow API methods not available after maximum attempts"));
            } else {
              setTimeout(checkSocialSparrow, interval);
            }
          }
        } else if (attempts >= maxAttempts) {
          console.error("DEBUGGING: SocialSparrow API failed to load after maximum attempts");
          reject(new Error("SocialSparrow API not available"));
        } else {
          console.log(`DEBUGGING: SocialSparrow not found yet, trying again in ${interval}ms`);
          setTimeout(checkSocialSparrow, interval);
        }
      };
      
      checkSocialSparrow();
    });
  }

  // Initialize everything
  function init() {
    // Set up network interceptors
    setupNetworkInterceptor();
    
    // Test AWS connectivity on startup
    console.log("DEBUGGING: Testing AWS connectivity...");
    testAWSConnectivity()
      .then(result => {
        console.log("DEBUGGING: AWS connectivity test result:", result);
      })
      .catch(error => {
        console.error("DEBUGGING: AWS connectivity test error:", error);
      });
    
    // Initial extraction with retry mechanism
    console.log("DEBUGGING: Content script loaded, setting up initial extraction");
    setTimeout(() => {
      console.log("DEBUGGING: Starting initial extraction");
      waitForSocialSparrow()
        .then((socialSparrow) => {
          console.log("DEBUGGING: SocialSparrow found, calling extractProductsFromPage");
          return extractProductsFromPage();
        })
        .catch((error) => {
          console.error("DEBUGGING: Failed to load SocialSparrow:", error);
          // Try DOM-based extraction as fallback
          console.log("DEBUGGING: Attempting DOM-based extraction as fallback");
          extractProductsFromDOM();
        });
    }, 2000);
    
    // Track URL changes for single-page applications
    console.log("DEBUGGING: Setting up MutationObserver for URL changes");
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        console.log("DEBUGGING: Page navigation detected, waiting for content to load...");
        
        // Wait a bit for the new page content to load
        setTimeout(() => {
          console.log("DEBUGGING: Extracting products after navigation");
          waitForSocialSparrow()
            .then(() => extractProductsFromPage())
            .catch((error) => {
              console.error("DEBUGGING: Failed to load SocialSparrow after navigation:", error);
              // Try DOM-based extraction as fallback
              extractProductsFromDOM();
            });
        }, 3000); // Increased wait time to 3 seconds
      }
    }).observe(document, { subtree: true, childList: true });
    
    console.log("DEBUGGING: Content script initialization complete");
  }

  // Start the initialization
  init();
})();
