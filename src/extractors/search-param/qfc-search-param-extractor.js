import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * QFC specific search parameter extractor
 */
export class QFCSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from QFC URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      const urlObj = new URL(url)
      return urlObj.searchParams.get("query")
    } catch (error) {
      console.error("Error extracting QFC search term:", error)
      return null
    }
  }
}
