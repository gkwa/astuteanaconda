/**
 * API functionality for interacting with DynamoDB
 */
import {
  transformProducts,
  chunkItems,
  sendBatchToDynamoDB,
  testDynamoDBConnectivity,
} from "./dynamodb-service.js"

// IMPORTANT: Keep the original export of sendBatchToDynamoDB
export const saveProductsToDynamoDB = sendBatchToDynamoDB

// Export the DynamoDB functions
export const testAWSConnectivity = testDynamoDBConnectivity
