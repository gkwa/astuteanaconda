/**
 * AWS credentials management
 * In a real extension, you would likely use a backend service for security
 */

// Retrieve AWS credentials
// This uses environment variables in development
// In production, you would likely:
// 1. Use a backend service to avoid exposing credentials to client
// 2. Or use AWS Cognito or similar service for temporary credentials
// 3. Or use a serverless function as a proxy
export async function getAWSCredentials() {
  // For development/testing only
  // In production, these would never be hardcoded or exposed to the client

  // Check for credentials in chrome.storage (secured by the extension)
  return new Promise((resolve, reject) => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["aws_access_key_id", "aws_secret_access_key"], function (result) {
        if (result.aws_access_key_id && result.aws_secret_access_key) {
          resolve({
            accessKeyId: result.aws_access_key_id,
            secretAccessKey: result.aws_secret_access_key,
          })
        } else {
          // If not in storage, use default development credentials
          // This should be replaced with a secure method in production!
          resolve({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "your-key-here",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "your-secret-here",
          })
        }
      })
    } else {
      // Fallback for when running in development without chrome.storage
      resolve({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "your-key-here",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "your-secret-here",
      })
    }
  })
}

// Save AWS credentials to chrome.storage
export function saveAWSCredentials(accessKeyId, secretAccessKey) {
  return new Promise((resolve, reject) => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(
        {
          aws_access_key_id: accessKeyId,
          aws_secret_access_key: secretAccessKey,
        },
        function () {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve()
          }
        },
      )
    } else {
      reject(new Error("Chrome storage not available"))
    }
  })
}
