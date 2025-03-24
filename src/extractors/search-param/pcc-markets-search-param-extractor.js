import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * PCC Markets specific search parameter extractor
 */
export class PCCMarketsSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from PCC Markets URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      const urlObj = new URL(url)
      return urlObj.searchParams.get("k")
    } catch (error) {
      console.error("Error extracting PCC Markets search term:", error)
      return null
    }
  }
}
