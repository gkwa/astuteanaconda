import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * Fred Meyer specific search parameter extractor
 */
export class FredMeyerSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from Fred Meyer URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      const urlObj = new URL(url)
      return urlObj.searchParams.get("query")
    } catch (error) {
      console.error("Error extracting Fred Meyer search term:", error)
      return null
    }
  }
}
