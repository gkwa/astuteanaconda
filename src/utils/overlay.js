/**
 * Create and manage an overlay for displaying status messages
 */

import { debug } from "./logger.js"

// Define constants for status types
const STATUS_SUCCESS = "success"
const STATUS_ERROR = "error"
const STATUS_INFO = "info"
const STATUS_WARNING = "warning"

/**
 * Create and manage an overlay that displays status messages on the page
 */
class StatusOverlay {
  constructor() {
    this.overlay = null
    this.messageElement = null
    this.timeoutId = null
  }

  /**
   * Create the overlay DOM elements
   * @private
   */
  createOverlay() {
    // Check if overlay already exists
    if (this.overlay) {
      return
    }

    // Create overlay container
    this.overlay = document.createElement("div")
    this.overlay.className = "astute-anaconda-overlay"
    this.overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      transition: opacity 0.3s ease-in-out;
      max-width: 350px;
    `

    // Create message element
    this.messageElement = document.createElement("div")
    this.messageElement.className = "astute-anaconda-message"
    this.overlay.appendChild(this.messageElement)

    // Create close button
    const closeButton = document.createElement("button")
    closeButton.innerHTML = "×"
    closeButton.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: transparent;
      border: none;
      color: inherit;
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    closeButton.addEventListener("click", () => this.hide())
    this.overlay.appendChild(closeButton)

    // Add to the DOM
    document.body.appendChild(this.overlay)
  }

  /**
   * Show a message in the overlay
   * @param {string} message - The message to display
   * @param {string} type - The type of message (success, error, info, warning)
   * @param {number} duration - How long to show the message in ms (0 for indefinite)
   * @param {boolean} autoDismiss - Whether to automatically dismiss the message
   */
  show(message, type = STATUS_INFO, duration = 5000, autoDismiss = false) {
    debug(`Showing overlay message: ${message} (${type})`)
    this.createOverlay()

    // Set message text
    this.messageElement.textContent = message

    // Reset any previous styles and timeout
    this.resetState()

    // Apply styles based on type
    switch (type) {
      case STATUS_SUCCESS:
        this.overlay.style.backgroundColor = "#4CAF50"
        this.overlay.style.color = "#fff"
        break
      case STATUS_ERROR:
        this.overlay.style.backgroundColor = "#F44336"
        this.overlay.style.color = "#fff"
        break
      case STATUS_WARNING:
        this.overlay.style.backgroundColor = "#FF9800"
        this.overlay.style.color = "#fff"
        break
      default: // info
        this.overlay.style.backgroundColor = "#2196F3"
        this.overlay.style.color = "#fff"
    }

    // Show the overlay
    this.overlay.style.opacity = "1"
    this.overlay.style.display = "block"

    // Set auto-hide timeout if duration is provided and autoDismiss is true
    if (duration > 0 && autoDismiss) {
      this.timeoutId = setTimeout(() => this.hide(), duration)
    }
  }

  /**
   * Show a success message
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the message in ms
   * @param {boolean} autoDismiss - Whether to automatically dismiss the message
   */
  showSuccess(message, duration = 5000, autoDismiss = false) {
    this.show(message, STATUS_SUCCESS, duration, autoDismiss)
  }

  /**
   * Show an error message
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the message in ms
   * @param {boolean} autoDismiss - Whether to automatically dismiss the message
   */
  showError(message, duration = 8000, autoDismiss = false) {
    this.show(message, STATUS_ERROR, duration, autoDismiss)
  }

  /**
   * Show a warning message
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the message in ms
   * @param {boolean} autoDismiss - Whether to automatically dismiss the message
   */
  showWarning(message, duration = 6000, autoDismiss = false) {
    this.show(message, STATUS_WARNING, duration, autoDismiss)
  }

  /**
   * Show an info message
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the message in ms
   * @param {boolean} autoDismiss - Whether to automatically dismiss the message
   */
  showInfo(message, duration = 5000, autoDismiss = true) {
    this.show(message, STATUS_INFO, duration, autoDismiss)
  }

  /**
   * Hide the overlay
   */
  hide() {
    if (this.overlay) {
      this.overlay.style.opacity = "0"
      setTimeout(() => {
        if (this.overlay) {
          this.overlay.style.display = "none"
        }
      }, 300)
    }
  }

  /**
   * Reset state and clear timeout
   * @private
   */
  resetState() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }
}

// Export a singleton instance
export const statusOverlay = new StatusOverlay()
