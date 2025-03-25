// Import AWS SDK modules directly
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"

// Initialize state
let awsCredentials = {
  accessKeyId: null,
  secretAccessKey: null,
}

// Initialize DynamoDB client
let dynamoDBClient = null
let documentClient = null

// Function to initialize DynamoDB clients
function initializeDynamoDBClient() {
  if (!awsCredentials.accessKeyId || !awsCredentials.secretAccessKey) {
    return false
  }

  try {
    dynamoDBClient = new DynamoDBClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: awsCredentials.accessKeyId,
        secretAccessKey: awsCredentials.secretAccessKey,
      },
    })

    documentClient = DynamoDBDocumentClient.from(dynamoDBClient)
    return true
  } catch (error) {
    console.error("Error initializing DynamoDB client:", error)
    return false
  }
}

// Load AWS credentials on startup
chrome.storage.local.get(["awsAccessKeyId", "awsSecretAccessKey"], function (result) {
  if (result.awsAccessKeyId && result.awsSecretAccessKey) {
    awsCredentials.accessKeyId = result.awsAccessKeyId
    awsCredentials.secretAccessKey = result.awsSecretAccessKey
    console.log("AWS credentials loaded from storage")

    // Initialize DynamoDB client
    initializeDynamoDBClient()
  }
})

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PRODUCTS_EXTRACTED") {
    console.log(`Received ${message.products.length} products from content script`)

    // Auto-send to DynamoDB if credentials are available
    if (awsCredentials.accessKeyId && awsCredentials.secretAccessKey) {
      // Ensure clients are initialized
      if (!documentClient) {
        const initialized = initializeDynamoDBClient()
        if (!initialized) {
          console.error("Failed to initialize DynamoDB client")
          sendResponse({ received: true, error: "Failed to initialize DynamoDB client" })
          return true
        }
      }

      // Send products to DynamoDB
      sendProductsToDynamoDB(message.products).then((result) => {
        console.log("Auto-send to DynamoDB result:", result)
        // Notify content script of the result
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: "DYNAMODB_RESULT",
            success: result.success,
            message: result.message,
          })
        }
      })
    }

    // Always acknowledge receipt
    sendResponse({ received: true })
    return true // Keep the message channel open for async response
  }

  if (message.type === "SAVE_AWS_CREDENTIALS") {
    // Save credentials
    awsCredentials.accessKeyId = message.accessKeyId
    awsCredentials.secretAccessKey = message.secretAccessKey

    // Store in chrome.storage
    chrome.storage.local.set(
      {
        awsAccessKeyId: message.accessKeyId,
        awsSecretAccessKey: message.secretAccessKey,
      },
      () => {
        console.log("AWS credentials saved to storage")

        // Re-initialize DynamoDB client with new credentials
        const initialized = initializeDynamoDBClient()

        sendResponse({
          success: true,
          clientInitialized: initialized,
        })
      },
    )

    return true // Keep the message channel open for async response
  }

  if (message.type === "GET_AWS_CREDENTIALS_STATUS") {
    sendResponse({
      configured: !!(awsCredentials.accessKeyId && awsCredentials.secretAccessKey),
    })
    return false
  }
})

// Helper function to extract search terms from a product
function prepareSearchTerms(product) {
  // Extract words from various fields
  const searchableFields = [
    product.name || "Unknown Product",
    product.brand || "Unknown Brand",
    product.rawTextContent || "",
    product.size || ""
  ].filter(Boolean);
  
  // Combine, lowercase, remove special chars, and split into words
  const allText = searchableFields.join(' ').toLowerCase();
  const words = allText.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(word => word.length > 2);
  
  // Remove duplicates and return
  return [...new Set(words)];
}

// Function to send products to DynamoDB
async function sendProductsToDynamoDB(products) {
  if (!documentClient) {
    return {
      success: false,
      message: "DynamoDB client not initialized",
    }
  }

  try {
    const tableName = "happyhamster-products"
    console.log(`Sending ${products.length} products to DynamoDB`)

    const currentDate = new Date().toISOString().split("T")[0] // YYYY-MM-DD format
    const results = []

    for (const product of products) {
      const timestamp = product.timestamp || new Date().toISOString()
      const timeComponent = timestamp.split("T")[1].split(".")[0] + "Z"
      const productName = (product.name || "Unknown Product").replace(/\s+/g, "-")
      
      // Create standardized datetime for sorting in reverse order
      const reversibleTimestamp = (10000000000000 - new Date(timestamp).getTime()).toString()
      
      // Generate search terms
      const searchTerms = product.search 
        ? product.search.toLowerCase().split(/\s+/).filter(word => word.length > 2) 
        : prepareSearchTerms(product)

      // Create the RAW stage item
      const rawItem = {
        PK: `STAGE#RAW#${currentDate}`,
        SK: `${timeComponent}#${productName}`,
        Stage: "raw",
        CreatedAt: timestamp,
        OriginalTimestamp: timestamp,
        ProductName: productName,
        // Add the GSI attributes
        GSI1PK: "TIMESTAMP",
        GSI1SK: reversibleTimestamp,
        // Add the TimeRange GSI attribute
        GSI2PK: "TIMERANGE",
        // Add SearchTerms field for full text searches
        SearchTerms: searchTerms,
        // Add GSI3 attributes for search
        GSI3PK: searchTerms.length > 0 ? `SEARCH#${searchTerms[0]}` : "SEARCH#unknown",
        GSI3SK: reversibleTimestamp,
        ProductData: {
          name: product.name || "Unknown Product",
          brand: product.brand || "Unknown Brand",
          url: product.url || "",
          price: product.price || "",
          imageUrl: product.imageUrl || "",
          size: product.size || "N/A",
          rawTextContent: product.rawTextContent || "",
          timestamp: timestamp,
          search: product.search || searchTerms.join(' ')
        },
        ExpiryTime: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days TTL
      }

      // Send to DynamoDB
      const command = new PutCommand({
        TableName: tableName,
        Item: rawItem,
      })

      try {
        const result = await documentClient.send(command)
        console.log(`Successfully imported: ${productName}`)
        results.push({
          product: productName,
          success: true,
        })
      } catch (itemError) {
        console.error(`Error importing item ${productName}:`, itemError)
        results.push({
          product: productName,
          success: false,
          error: itemError.message,
        })
      }
    }

    return {
      success: true,
      message: `Processed ${products.length} products with ${results.filter((r) => r.success).length} successes and ${results.filter((r) => !r.success).length} failures`,
      results,
    }
  } catch (error) {
    console.error("Error sending products to DynamoDB:", error)
    return {
      success: false,
      message: `Error sending products to DynamoDB: ${error.message}`,
      error,
    }
  }
}
