import { PRODUCT_SCHEMA } from './schema.js';

/**
 * AWS DynamoDB integration for AstuteAnaconda
 * Handles sending extracted products to DynamoDB
 */

// Class to interact with DynamoDB
export class DynamoDBClient {
  constructor(accessKeyId, secretAccessKey) {
    this.region = "us-east-1"
    this.tableName = "happyhamster-products"
    this.accessKeyId = accessKeyId
    this.secretAccessKey = secretAccessKey
    this.initialized = false
  }

  // Initialize the AWS SDK with credentials
  async initialize() {
    if (this.initialized) return true

    try {
      // Import AWS SDK modules
      const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb")
      const { DynamoDBDocumentClient, PutCommand } = await import("@aws-sdk/lib-dynamodb")

      // Configure AWS SDK
      this.client = new DynamoDBClient({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      })

      this.docClient = DynamoDBDocumentClient.from(this.client)
      this.PutCommand = PutCommand
      this.initialized = true
      console.log("AWS DynamoDB client initialized")
      return true
    } catch (error) {
      console.error("Error initializing AWS SDK:", error)
      return false
    }
  }

  // Send products to DynamoDB
  async sendProducts(products) {
    if (!products || !Array.isArray(products) || products.length === 0) {
      console.error("No valid products to send to DynamoDB")
      return {
        success: false,
        message: "No valid products to send",
      }
    }

    const initialized = await this.initialize()
    if (!initialized) {
      return {
        success: false,
        message: "Failed to initialize AWS SDK",
      }
    }

    try {
      console.log(`Sending ${products.length} products to DynamoDB`)

      const currentDate = new Date().toISOString().split("T")[0] // YYYY-MM-DD format
      const results = []

      for (const product of products) {
        // Create DynamoDB item using the shared schema
        const rawItem = PRODUCT_SCHEMA.createDynamoDBItem(product, currentDate);

        // Send to DynamoDB
        const command = new this.PutCommand({
          TableName: this.tableName,
          Item: rawItem,
        })

        try {
          const result = await this.docClient.send(command)
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
}

export default {
  DynamoDBClient,
}
