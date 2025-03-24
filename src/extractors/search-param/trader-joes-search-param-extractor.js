import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * Trader Joe's specific search parameter extractor
 */
export class TraderJoesSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from Trader Joe's URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      const urlObj = new URL(url)
      return urlObj.searchParams.get("q")
    } catch (error) {
      console.error("Error extracting Trader Joe's search term:", error)
      return null
    }
  }
}
