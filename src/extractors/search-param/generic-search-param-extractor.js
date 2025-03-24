import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * Generic search parameter extractor for fallback
 */
export class GenericSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter using common parameter names
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      // Create URL object to work with
      const urlObj = new URL(url)

      // Try common search parameter names
      const commonParams = [
        "q",
        "query",
        "search",
        "searchTerm",
        "term",
        "keyword",
        "keywords",
        "s",
        "k",
        "text",
      ]

      for (const param of commonParams) {
        const value = urlObj.searchParams.get(param)
        if (value) return value
      }

      return null
    } catch (error) {
      console.error("Error extracting search term:", error)
      return null
    }
  }
}
