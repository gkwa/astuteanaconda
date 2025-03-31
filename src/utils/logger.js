/**
 * Centralized logging utility for AstuteAnaconda
 */

// Control whether debug logs are displayed
const DEBUG_MODE = true;

/**
 * Log levels
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * Logs a message with the specified level
 * @param {string} message - The message to log
 * @param {LogLevel} level - The log level
 * @param {any} [data] - Optional data to log
 */
export function log(message, level = LogLevel.DEBUG, data = null) {
  if (!DEBUG_MODE && level === LogLevel.DEBUG) {
    return;
  }

  const prefix = level === LogLevel.DEBUG ? 'DEBUGGING: ' : `[${level.toUpperCase()}] `;
  
  switch (level) {
    case LogLevel.ERROR:
      if (data) {
        console.error(`${prefix}${message}`, data);
      } else {
        console.error(`${prefix}${message}`);
      }
      break;
    case LogLevel.WARN:
      if (data) {
        console.warn(`${prefix}${message}`, data);
      } else {
        console.warn(`${prefix}${message}`);
      }
      break;
    default:
      if (data) {
        console.log(`${prefix}${message}`, data);
      } else {
        console.log(`${prefix}${message}`);
      }
  }
}

/**
 * Log a debug message
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to log
 */
export function debug(message, data = null) {
  log(message, LogLevel.DEBUG, data);
}

/**
 * Log an info message
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to log
 */
export function info(message, data = null) {
  log(message, LogLevel.INFO, data);
}

/**
 * Log a warning message
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to log
 */
export function warn(message, data = null) {
  log(message, LogLevel.WARN, data);
}

/**
 * Log an error message
 * @param {string} message - The message to log
 * @param {any} [data] - Optional data to log
 */
export function error(message, data = null) {
  log(message, LogLevel.ERROR, data);
}

