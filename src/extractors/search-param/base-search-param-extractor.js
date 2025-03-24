/**
 * Base search parameter extractor that defines the interface
 * Follows Interface Segregation Principle
 */
export class BaseSearchParamExtractor {
  /**
   * Extract search parameter from a URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    throw new Error("Method must be implemented by subclass")
  }
}
