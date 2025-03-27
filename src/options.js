import { saveAWSCredentials } from "./aws-credentials.js"
import { testAWSConnectivity } from "./api.js"

document.addEventListener("DOMContentLoaded", function () {
  const accessKeyIdInput = document.getElementById("accessKeyId")
  const secretAccessKeyInput = document.getElementById("secretAccessKey")
  const saveBtn = document.getElementById("saveBtn")
  const testBtn = document.getElementById("testBtn")
  const statusDiv = document.getElementById("status")

  // Load saved credentials if they exist
  chrome.storage.local.get(["aws_access_key_id", "aws_secret_access_key"], function (result) {
    if (result.aws_access_key_id) {
      accessKeyIdInput.value = result.aws_access_key_id
    }
    if (result.aws_secret_access_key) {
      secretAccessKeyInput.value = result.aws_secret_access_key
    }
  })

  // Save credentials
  saveBtn.addEventListener("click", function () {
    const accessKeyId = accessKeyIdInput.value.trim()
    const secretAccessKey = secretAccessKeyInput.value.trim()

    if (!accessKeyId || !secretAccessKey) {
      showStatus("Please enter both AWS Access Key ID and Secret Access Key", "error")
      return
    }

    saveAWSCredentials(accessKeyId, secretAccessKey)
      .then(() => {
        showStatus("AWS credentials saved successfully!", "success")
      })
      .catch((error) => {
        showStatus(`Error saving credentials: ${error.message}`, "error")
      })
  })

  // Test AWS connection
  testBtn.addEventListener("click", function () {
    showStatus("Testing AWS connection...", "")

    // First save the credentials if they've been entered
    const accessKeyId = accessKeyIdInput.value.trim()
    const secretAccessKey = secretAccessKeyInput.value.trim()

    if (accessKeyId && secretAccessKey) {
      saveAWSCredentials(accessKeyId, secretAccessKey)
        .then(() => testAWSConnection())
        .catch((error) => {
          showStatus(`Error saving credentials: ${error.message}`, "error")
        })
    } else {
      testAWSConnection()
    }
  })

  // Helper function to test AWS connection
  function testAWSConnection() {
    testAWSConnectivity()
      .then((result) => {
        if (result.success) {
          showStatus("AWS connection test successful!", "success")
        } else {
          showStatus(`AWS connection test failed: ${result.error}`, "error")
        }
      })
      .catch((error) => {
        showStatus(`Error testing AWS connection: ${error.message}`, "error")
      })
  }

  // Helper function to show status messages
  function showStatus(message, type) {
    statusDiv.textContent = message
    statusDiv.className = "status " + type
    statusDiv.style.display = "block"

    // Hide status after 5 seconds if it's a success message
    if (type === "success") {
      setTimeout(() => {
        statusDiv.style.display = "none"
      }, 5000)
    }
  }
})
