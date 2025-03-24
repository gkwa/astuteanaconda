import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * H Mart specific search parameter extractor
 */
export class HMartSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from H Mart URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      const urlObj = new URL(url)
      return urlObj.searchParams.get("_q")
    } catch (error) {
      console.error("Error extracting H Mart search term:", error)
      return null
    }
  }
}
