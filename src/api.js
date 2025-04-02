/**
 * API functionality for interacting with DynamoDB
 */
import {
  transformProducts,
  chunkItems,
  sendBatchToDynamoDB,
  testDynamoDBConnectivity,
} from "./dynamodb-service.js"

// Let the content script know about the operation status
function notifyProductCount(count, success = true) {
  window.postMessage(
    {
      type: "SHOW_PRODUCT_COUNT",
      count,
      success,
    },
    "*",
  )
}

function notifyBatchStatus(currentBatch, totalBatches) {
  window.postMessage(
    {
      type: "SHOW_BATCH_STATUS",
      currentBatch,
      totalBatches,
    },
    "*",
  )
}

function notifySaveResult(count, batches, successfulBatches, failedBatches) {
  window.postMessage(
    {
      type: "SHOW_SAVE_RESULT",
      count,
      batches,
      successfulBatches,
      failedBatches,
    },
    "*",
  )
}

// Modified version that sends notifications
export async function saveProductsToDynamoDB(products) {
  try {
    // Notify about product count
    if (products && products.length > 0) {
      notifyProductCount(products.length, true)
    } else {
      notifyProductCount(0, false)
      return { success: false, error: "No products to save" }
    }

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
    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < chunks.length; i++) {
      // Notify about batch status
      notifyBatchStatus(i + 1, chunks.length)

      try {
        const result = await sendBatchToDynamoDB(chunks[i])
        results.push(result)
        successCount++
      } catch (error) {
        console.error(`Error processing batch ${i + 1}:`, error)
        failureCount++
      }
    }

    // Notify about final result
    notifySaveResult(transformedItems.length, chunks.length, successCount, failureCount)

    return {
      success: failureCount === 0,
      results,
      count: transformedItems.length,
      batches: chunks.length,
      successfulBatches: successCount,
      failedBatches: failureCount,
    }
  } catch (error) {
    console.error("Error in saveProductsToDynamoDB:", error)
    throw error
  }
}

// Export the DynamoDB functions
export const testAWSConnectivity = testDynamoDBConnectivity
