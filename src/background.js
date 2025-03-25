import { PRODUCT_SCHEMA } from './schema.js';

// Rest of background.js imports...

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
      // Create DynamoDB item using the shared schema
      const rawItem = PRODUCT_SCHEMA.createDynamoDBItem(product, currentDate);

      // Send to DynamoDB
      const command = new PutCommand({
        TableName: tableName,
        Item: rawItem,
      })

      try {
        const result = await documentClient.send(command)
        console.log(`Successfully imported: ${rawItem.ProductName}`)
        results.push({
          product: rawItem.ProductName,
          success: true,
        })
      } catch (itemError) {
        console.error(`Error importing item ${rawItem.ProductName}:`, itemError)
        results.push({
          product: rawItem.ProductName,
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

// Rest of background.js remains the same...
