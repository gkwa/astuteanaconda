/**
 * API functionality for interacting with DynamoDB
 */
import {
  transformProducts,
  chunkItems,
  sendBatchToDynamoDB,
  testDynamoDBConnectivity
} from "./dynamodb-service.js"

// Export the DynamoDB functions
export const saveProductsToDynamoDB = sendBatchToDynamoDB;
export const testAWSConnectivity = testDynamoDBConnectivity;
