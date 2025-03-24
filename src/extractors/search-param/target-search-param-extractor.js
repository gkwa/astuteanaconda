import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * Target specific search parameter extractor
 */
export class TargetSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from Target URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      const urlObj = new URL(url)
      return urlObj.searchParams.get("searchTerm")
    } catch (error) {
      console.error("Error extracting Target search term:", error)
      return null
    }
  }
}
