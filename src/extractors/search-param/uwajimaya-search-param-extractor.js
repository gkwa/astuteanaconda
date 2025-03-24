import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * Uwajimaya specific search parameter extractor
 */
export class UwajimayaSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from Uwajimaya URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      const urlObj = new URL(url)
      return urlObj.searchParams.get("s")
    } catch (error) {
      console.error("Error extracting Uwajimaya search term:", error)
      return null
    }
  }
}
