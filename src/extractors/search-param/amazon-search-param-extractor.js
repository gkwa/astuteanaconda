import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * Amazon specific search parameter extractor
 */
export class AmazonSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from Amazon URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      const urlObj = new URL(url)
      return urlObj.searchParams.get("k")
    } catch (error) {
      console.error("Error extracting Amazon search term:", error)
      return null
    }
  }
}
