import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * Whole Foods specific search parameter extractor
 */
export class WholeFoodsSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from Whole Foods URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      const urlObj = new URL(url)
      return urlObj.searchParams.get("text")
    } catch (error) {
      console.error("Error extracting Whole Foods search term:", error)
      return null
    }
  }
}
