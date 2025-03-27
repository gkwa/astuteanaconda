/**
 * API functionality for interacting with DynamoDB
 */

import {
  transformProducts,
  chunkItems,
  createBatchWriteRequest,
  sendBatchToAWS,
} from "./dynamodb-utils.js"

// Process products and save them to DynamoDB
export async function saveProductsToDynamoDB(products) {
  try {
    console.log(`DEBUGGING: saveProductsToDynamoDB called with ${products.length} products`)

    // Get the current domain
    const domain = window.location.hostname

    // Transform the products to DynamoDB format
    const transformedItems = transformProducts(products, domain)
    console.log(`DEBUGGING: Transformed ${transformedItems.length} items for DynamoDB`)

    // Split into chunks of 25 items (DynamoDB BatchWrite limit)
    const chunks = chunkItems(transformedItems)
    console.log(`DEBUGGING: Split into ${chunks.length} chunks`)

    // Send each chunk to DynamoDB
    const results = []
    for (let i = 0; i < chunks.length; i++) {
      console.log(`DEBUGGING: Processing chunk ${i + 1} of ${chunks.length}...`)

      const batchRequest = createBatchWriteRequest(chunks[i])
      const result = await sendBatchToAWS(batchRequest)
      results.push(result)

      console.log(`DEBUGGING: Chunk ${i + 1} processed successfully`)

      // Add a small delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    console.log(`DEBUGGING: All ${chunks.length} chunks processed successfully`)
    return { success: true, results }
  } catch (error) {
    console.error("DEBUGGING: Error saving products to DynamoDB:", error)
    return { success: false, error: error.message }
  }
}

// Test AWS connectivity
export async function testAWSConnectivity() {
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
          product: { M: { name: { S: "Test Product" } } },
        },
      },
    }

    const batchRequest = createBatchWriteRequest([testItem])

    // Try to send the test item
    await sendBatchToAWS(batchRequest)
    return { success: true, message: "AWS connectivity test successful" }
  } catch (error) {
    console.error("AWS connectivity test failed:", error)
    return { success: false, error: error.message }
  }
}
