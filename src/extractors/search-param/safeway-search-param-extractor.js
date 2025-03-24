import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * Safeway specific search parameter extractor
 */
export class SafewaySearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from Safeway URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      const urlObj = new URL(url)
      return urlObj.searchParams.get("q")
    } catch (error) {
      console.error("Error extracting Safeway search term:", error)
      return null
    }
  }
}
