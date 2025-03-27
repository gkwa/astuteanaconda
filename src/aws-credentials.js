/**
 * AWS credentials management for browser extension
 */

// Retrieve AWS credentials from chrome.storage
export async function getAWSCredentials() {
  return new Promise((resolve, reject) => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["aws_access_key_id", "aws_secret_access_key"], function (result) {
        if (result.aws_access_key_id && result.aws_secret_access_key) {
          // Return credentials from storage
          resolve({
            accessKeyId: result.aws_access_key_id,
            secretAccessKey: result.aws_secret_access_key,
          })
        } else {
          reject(
            new Error("AWS credentials not found. Please configure them in the extension options.")
          )
        }
      })
    } else {
      reject(new Error("Chrome storage not available"))
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
        }
      )
    } else {
      reject(new Error("Chrome storage not available"))
    }
  })
}
