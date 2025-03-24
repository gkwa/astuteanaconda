/**
 * AWS DynamoDB integration for AstuteAnaconda
 * Handles sending extracted products to DynamoDB
 */

// Function to send products to DynamoDB
export async function sendProductsToDynamoDB(products) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    console.error("No valid products to send to DynamoDB")
    return {
      success: false,
      message: "No valid products to send",
    }
  }

  try {
    console.log(`Preparing to send ${products.length} products to DynamoDB`)

    // Ensure AWS credentials are available
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error("AWS credentials not found in environment variables")
      return {
        success: false,
        message: "AWS credentials not found in environment variables",
      }
    }

    // Create payload in the format expected by the Lambda function
    const payload = {
      products: products.map((product) => ({
        name: product.name || "Unknown Product",
        brand: product.brand || "Unknown Brand",
        url: product.url || "",
        price: product.price || "",
        imageUrl: product.imageUrl || "",
        size: product.size || "N/A",
        rawTextContent: product.rawTextContent || "",
        timestamp: new Date().toISOString(),
      })),
    }

    // Make the API call to AWS Lambda
    const response = await fetch(
      "https://lambda.us-east-1.amazonaws.com/2015-03-31/functions/happyhamster-products-loader/invocations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
          "X-Amz-Date": new Date()
            .toISOString()
            .replace(/[:-]|\.\d{3}/g, "")
            .replace("T", ""),
          Authorization: await generateAWSSignature(),
        },
        body: JSON.stringify(payload),
      },
    )

    if (!response.ok) {
      console.error("Error sending products to DynamoDB:", await response.text())
      return {
        success: false,
        message: `Error sending products to DynamoDB: ${response.status} ${response.statusText}`,
      }
    }

    const result = await response.json()
    console.log("Successfully sent products to DynamoDB:", result)

    return {
      success: true,
      message: `Successfully sent ${products.length} products to DynamoDB`,
      result,
    }
  } catch (error) {
    console.error("Exception sending products to DynamoDB:", error)
    return {
      success: false,
      message: `Exception sending products to DynamoDB: ${error.message}`,
      error,
    }
  }
}

// Generate AWS signature for API requests
async function generateAWSSignature() {
  // Implementation of AWS Signature v4 would go here
  // For this implementation, we'll use the AWS SDK in the background
  // This is a placeholder for the actual signature generation logic
  return "AWS4-HMAC-SHA256 Credential=ACCESS_KEY/20250324/us-east-1/lambda/aws4_request"
}

// AWS SDK implementation using AWS-SDK v3
export class DynamoDBClient {
  constructor() {
    this.region = "us-east-1"
    this.tableName = "happyhamster-products"
  }

  // Initialize the AWS SDK with credentials
  async initialize() {
    try {
      // Import AWS SDK modules
      const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb")
      const { DynamoDBDocumentClient, PutCommand } = await import("@aws-sdk/lib-dynamodb")

      // Configure AWS SDK
      this.client = new DynamoDBClient({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      })

      this.docClient = DynamoDBDocumentClient.from(this.client)
      console.log("AWS DynamoDB client initialized")
      return true
    } catch (error) {
      console.error("Error initializing AWS SDK:", error)
      return false
    }
  }

  // Send products to DynamoDB using the SDK directly
  async sendProducts(products) {
    if (!this.docClient) {
      const initialized = await this.initialize()
      if (!initialized) {
        return {
          success: false,
          message: "Failed to initialize AWS SDK",
        }
      }
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      return {
        success: false,
        message: "No valid products to send",
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
        const command = new PutCommand({
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
  sendProductsToDynamoDB,
  DynamoDBClient,
}
