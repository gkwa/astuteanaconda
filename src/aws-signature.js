/**
 * Utility for creating AWS Signature Version 4
 * Based on AWS documentation for signature calculation
 */

// Calculate a SHA-256 hash
async function sha256(message) {
  // encode as UTF-8
  const msgBuffer = new TextEncoder().encode(message)

  // hash the message
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)

  // convert to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Convert byte array to hex string
function toHex(data) {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Get signature key for AWS requests
async function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = await hmacSha256("AWS4" + key, dateStamp)
  const kRegion = await hmacSha256(kDate, regionName)
  const kService = await hmacSha256(kRegion, serviceName)
  const kSigning = await hmacSha256(kService, "aws4_request")
  return kSigning
}

// Create an HMAC SHA-256 signature
async function hmacSha256(key, message) {
  const keyData = typeof key === "string" ? new TextEncoder().encode(key) : key

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const msgData = new TextEncoder().encode(message)
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData)

  return new Uint8Array(signature)
}

// Generate AWS signature for DynamoDB request
export async function signRequest(method, host, region, service, body, accessKey, secretKey) {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "")
  const dateStamp = amzDate.substring(0, 8)

  // Create canonical request
  const canonicalUri = "/"
  const canonicalQueryString = ""
  const canonicalHeaders =
    "content-type:application/x-amz-json-1.0\n" +
    "host:" +
    host +
    "\n" +
    "x-amz-date:" +
    amzDate +
    "\n" +
    "x-amz-target:DynamoDB_20120810.BatchWriteItem\n"

  const signedHeaders = "content-type;host;x-amz-date;x-amz-target"

  // Create payload hash
  const payloadHash = await sha256(JSON.stringify(body))

  const canonicalRequest =
    method +
    "\n" +
    canonicalUri +
    "\n" +
    canonicalQueryString +
    "\n" +
    canonicalHeaders +
    "\n" +
    signedHeaders +
    "\n" +
    payloadHash

  // Create string to sign
  const algorithm = "AWS4-HMAC-SHA256"
  const credentialScope = dateStamp + "/" + region + "/" + service + "/aws4_request"
  const stringToSign =
    algorithm + "\n" + amzDate + "\n" + credentialScope + "\n" + (await sha256(canonicalRequest))

  // Calculate signature
  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))

  // Create authorization header
  const authorizationHeader =
    algorithm +
    " " +
    "Credential=" +
    accessKey +
    "/" +
    credentialScope +
    ", " +
    "SignedHeaders=" +
    signedHeaders +
    ", " +
    "Signature=" +
    signature

  // Return headers for the request
  return {
    "Content-Type": "application/x-amz-json-1.0",
    "X-Amz-Date": amzDate,
    "X-Amz-Target": "DynamoDB_20120810.BatchWriteItem",
    Authorization: authorizationHeader,
  }
}
