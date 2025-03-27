/**
 * Service for interacting with DynamoDB
 * This version creates a standalone module that doesn't depend on imports
 */

// Generate a timestamp with date and product name as discriminator
function generateTimestamp(productName) {
  const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  return `${now}#${productName}`;
}

// Generate TTL value (30 days from now)
function generateTTL() {
  return Math.floor(Date.now() / 1000) + 2592000; // Current time + 30 days in seconds
}

// Retrieve AWS credentials from chrome.storage
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

// Calculate a SHA-256 hash
async function sha256(message) {
  // encode as UTF-8
  const msgBuffer = new TextEncoder().encode(message);
  
  // hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  
  // convert to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert byte array to hex string
function toHex(data) {
  return Array.from(data)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Create an HMAC SHA-256 signature
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

// Get signature key for AWS requests
async function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = await hmacSha256('AWS4' + key, dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

// Generate AWS signature for DynamoDB request
async function signRequest(method, host, region, service, body, accessKey, secretKey) {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  
  // Create canonical request
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = 
    'content-type:application/x-amz-json-1.0\n' +
    'host:' + host + '\n' +
    'x-amz-date:' + amzDate + '\n' +
    'x-amz-target:DynamoDB_20120810.BatchWriteItem\n';
  
  const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
  
  // Create payload hash
  const payloadHash = await sha256(JSON.stringify(body));
  
  const canonicalRequest = method + '\n' +
    canonicalUri + '\n' +
    canonicalQueryString + '\n' +
    canonicalHeaders + '\n' +
    signedHeaders + '\n' +
    payloadHash;
  
  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = dateStamp + '/' + region + '/' + service + '/aws4_request';
  const stringToSign = algorithm + '\n' +
    amzDate + '\n' +
    credentialScope + '\n' +
    await sha256(canonicalRequest);
  
  // Calculate signature
  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));
  
  // Create authorization header
  const authorizationHeader = algorithm + ' ' +
    'Credential=' + accessKey + '/' + credentialScope + ', ' +
    'SignedHeaders=' + signedHeaders + ', ' +
    'Signature=' + signature;
  
  // Return headers for the request
  return {
    'Content-Type': 'application/x-amz-json-1.0',
    'X-Amz-Date': amzDate,
    'X-Amz-Target': 'DynamoDB_20120810.BatchWriteItem',
    'Authorization': authorizationHeader
  };
}

// Transform product data from SocialSparrow to DynamoDB format
export function transformProducts(products, domain) {
  // Keep track of seen keys to avoid duplicates
  const seenKeys = new Set();
  const transformedItems = [];

  if (!products || !Array.isArray(products) || products.length === 0) {
    console.error("No valid products array provided to transform");
    return [];
  }

  products.forEach((product) => {
    // Extract product name, defaulting to "Unknown Product" if not available
    const productName = product.name || product.title || "Unknown Product";
    
    // Determine category - use a default if not present
    let category = "general";
    if (product.category) {
      category = product.category;
    } else if (product.tags && product.tags.length > 0) {
      category = product.tags[0];
    } else if (product.breadcrumbs && product.breadcrumbs.length > 0) {
      category = product.breadcrumbs[product.breadcrumbs.length - 1];
    }

    // Create a base timestamp
    let baseTimestamp = generateTimestamp(productName);
    
    // Check if this key already exists, if so, add a unique identifier
    let timestamp = baseTimestamp;
    let counter = 1;
    while (seenKeys.has(`${category}:${timestamp}`)) {
      // Add a unique suffix to make it unique
      timestamp = `${baseTimestamp}#${counter}`;
      counter++;
    }

    // Mark this key as seen
    seenKeys.add(`${category}:${timestamp}`);

    // Create the DynamoDB item
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

    // Add all product properties to the product map
    const productMap = dynamoItem.PutRequest.Item.product.M;
    
    for (const [key, value] of Object.entries(product)) {
      // Skip keys that are already top-level attributes
      if (["category", "timestamp", "domain", "ttl", "entity_type"].includes(key)) {
        continue;
      }

      // Handle different value types
      if (value === null) {
        productMap[key] = { NULL: true };
      } else if (typeof value === "boolean") {
        productMap[key] = { BOOL: value };
      } else if (typeof value === "number") {
        productMap[key] = { N: String(value) };
      } else if (Array.isArray(value)) {
        // For arrays, stringify them to store as a string
        productMap[key] = { S: JSON.stringify(value) };
      } else if (typeof value === "object") {
        // For objects, stringify them to store as a string
        productMap[key] = { S: JSON.stringify(value) };
      } else {
        productMap[key] = { S: String(value) };
      }
    }

    transformedItems.push(dynamoItem);
  });

  return transformedItems;
}

// Split items into chunks of specified size (default 25 for DynamoDB batch limit)
export function chunkItems(items, chunkSize = 25) {
  return Array(Math.ceil(items.length / chunkSize))
    .fill()
    .map((_, index) => items.slice(index * chunkSize, (index + 1) * chunkSize));
}

// Create batch write request
export function createBatchWriteRequest(items) {
  return {
    RequestItems: {
      dreamydungbeetle: items
    }
  };
}

// Send batch write request to DynamoDB
export async function sendBatchToDynamoDB(products) {
  try {
    // Get the current domain
    const domain = window.location.hostname;
    
    // Transform the products to DynamoDB format
    const transformedItems = transformProducts(products, domain);
    console.log(`DEBUGGING: Transformed ${transformedItems.length} items for DynamoDB`);
    
    // Split into chunks of 25 items (DynamoDB BatchWrite limit)
    const chunks = chunkItems(transformedItems);
    console.log(`DEBUGGING: Split into ${chunks.length} chunks`);
    
    // Get AWS credentials
    const credentials = await getAWSCredentials();
    
    // DynamoDB endpoint for the specified region
    const region = "us-east-1";
    const host = `dynamodb.${region}.amazonaws.com`;
    
    // Send each chunk to DynamoDB
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`DEBUGGING: Processing chunk ${i + 1} of ${chunks.length}...`);
      
      // Create batch request
      const batchRequest = createBatchWriteRequest(chunks[i]);
      
      // Generate signature for the request
      const headers = await signRequest(
        "POST",
        host,
        region,
        "dynamodb",
        batchRequest,
        credentials.accessKeyId,
        credentials.secretAccessKey
      );
      
      // Send the request to AWS
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
      
      // Add a small delay between chunks to avoid rate limiting
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

// Test AWS connectivity
export async function testDynamoDBConnectivity() {
  try {
    // Create a minimal test item
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
    
    // Get AWS credentials
    const credentials = await getAWSCredentials();
    
    // DynamoDB endpoint for the specified region
    const region = "us-east-1";
    const host = `dynamodb.${region}.amazonaws.com`;
    
    // Create batch request
    const batchRequest = createBatchWriteRequest([testItem]);
    
    // Generate signature for the request
    const headers = await signRequest(
      "POST",
      host,
      region,
      "dynamodb",
      batchRequest,
      credentials.accessKeyId,
      credentials.secretAccessKey
    );
    
    // Send the request to AWS
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

