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
        const timestamp = product.timestamp || new Date().toISOString()
        const timeComponent = timestamp.split("T")[1].split(".")[0] + "Z"
        const productName = (product.name || "Unknown Product").replace(/\s+/g, "-")

        // Create the RAW stage item following the same format as the Lambda function
        const rawItem = {
          PK: `STAGE#RAW#${currentDate}`,
          SK: `${timeComponent}#${productName}`,
          Stage: "raw",
          CreatedAt: timestamp,
          OriginalTimestamp: timestamp,
          ProductName: productName,
          ProductData: {
            name: product.name || "Unknown Product",
            brand: product.brand || "Unknown Brand",
            url: product.url || "",
            price: product.price || "",
            imageUrl: product.imageUrl || "",
            size: product.size || "N/A",
            rawTextContent: product.rawTextContent || "",
            timestamp: timestamp,
          },
          ExpiryTime: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days TTL
        }

        // Send to DynamoDB
        const command = new this.PutCommand({
          TableName: this.tableName,
          Item: rawItem,
        })

        try {
          const result = await this.docClient.send(command)
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
}

export default {
  DynamoDBClient,
}
