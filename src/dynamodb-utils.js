/**
 * Utility functions for interacting with DynamoDB
 */

import { getAWSCredentials } from "./aws-credentials.js"
import { signRequest } from "./aws-signature.js"

// Generate a timestamp with date and product name as discriminator
function generateTimestamp(productName) {
  const now = new Date().toISOString().split("T")[0] // YYYY-MM-DD format
  return `${now}#${productName}`
}

// Generate TTL value (30 days from now)
function generateTTL() {
  return Math.floor(Date.now() / 1000) + 2592000 // Current time + 30 days in seconds
}

// Transform product data from SocialSparrow to DynamoDB format
export function transformProducts(products, domain) {
  // Keep track of seen keys to avoid duplicates
  const seenKeys = new Set()
  const transformedItems = []

  if (!products || !Array.isArray(products) || products.length === 0) {
    console.error("No valid products array provided to transform")
    return []
  }

  products.forEach((product) => {
    // Extract product name, defaulting to "Unknown Product" if not available
    const productName = product.name || product.title || "Unknown Product"

    // Determine category - use a default if not present
    // This assumes categories might be in different fields depending on the source
    let category = "general"
    if (product.category) {
      category = product.category
    } else if (product.tags && product.tags.length > 0) {
      category = product.tags[0]
    } else if (product.breadcrumbs && product.breadcrumbs.length > 0) {
      category = product.breadcrumbs[product.breadcrumbs.length - 1]
    }

    // Create a base timestamp
    let baseTimestamp = generateTimestamp(productName)

    // Check if this key already exists, if so, add a unique identifier
    let timestamp = baseTimestamp
    let counter = 1
    while (seenKeys.has(`${category}:${timestamp}`)) {
      // Add a unique suffix to make it unique
      timestamp = `${baseTimestamp}#${counter}`
      counter++
    }

    // Mark this key as seen
    seenKeys.add(`${category}:${timestamp}`)

    // Create the DynamoDB item
    const dynamoItem = {
      PutRequest: {
        Item: {
          category: { S: category },
          timestamp: { S: timestamp },
          domain: { S: domain },
          ttl: { N: String(generateTTL()) },
          entity_type: { S: "category" },
          product: { M: {} },
        },
      },
    }

    // Add all product properties to the product map
    const productMap = dynamoItem.PutRequest.Item.product.M

    for (const [key, value] of Object.entries(product)) {
      // Skip keys that are already top-level attributes
      if (["category", "timestamp", "domain", "ttl", "entity_type"].includes(key)) {
        continue
      }

      // Handle different value types
      if (value === null) {
        productMap[key] = { NULL: true }
      } else if (typeof value === "boolean") {
        productMap[key] = { BOOL: value }
      } else if (typeof value === "number") {
        productMap[key] = { N: String(value) }
      } else if (Array.isArray(value)) {
        // For arrays, stringify them to store as a string
        productMap[key] = { S: JSON.stringify(value) }
      } else if (typeof value === "object") {
        // For objects, stringify them to store as a string
        productMap[key] = { S: JSON.stringify(value) }
      } else {
        productMap[key] = { S: String(value) }
      }
    }

    transformedItems.push(dynamoItem)
  })

  return transformedItems
}

// Split items into chunks of specified size (default 25 for DynamoDB batch limit)
export function chunkItems(items, chunkSize = 25) {
  return Array(Math.ceil(items.length / chunkSize))
    .fill()
    .map((_, index) => items.slice(index * chunkSize, (index + 1) * chunkSize))
}

// Create AWS batch write request
export function createBatchWriteRequest(items) {
  return {
    RequestItems: {
      dreamydungbeetle: items,
    },
  }
}

// Send batch write request to DynamoDB
export async function sendBatchToAWS(batchRequest) {
  try {
    // Get AWS credentials
    const credentials = await getAWSCredentials()

    // DynamoDB endpoint for the specified region
    const region = "us-east-1"
    const host = `dynamodb.${region}.amazonaws.com`

    // Generate signature for the request
    const headers = await signRequest(
      "POST",
      host,
      region,
      "dynamodb",
      batchRequest,
      credentials.accessKeyId,
      credentials.secretAccessKey,
    )

    // Send the request to AWS
    const response = await fetch(`https://${host}`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(batchRequest),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AWS returned status code ${response.status}: ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error sending batch to AWS:", error)
    throw error
  }
}
