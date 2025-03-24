import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"
/**
 * Lam's Seafood specific search parameter extractor
 */
export class LamsSeafoodSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from Lam's Seafood URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null
      const urlObj = new URL(url)

      // Try to get the filter[text] parameter directly
      const filterText = urlObj.searchParams.get("filter[text]")
      if (filterText) return filterText

      // If that doesn't work, try with the encoded version
      const encodedParam = urlObj.searchParams.get("filter%5Btext%5D")
      if (encodedParam) return encodedParam

      // As a fallback, try the regex approach for complex cases
      const searchParamString = urlObj.search
      const regex = /filter(?:%5B|\[)text(?:%5D|\])=([^&]+)/
      const match = searchParamString.match(regex)
      if (match && match[1]) {
        return decodeURIComponent(match[1])
      }

      return null
    } catch (error) {
      console.error("Error extracting Lam's Seafood search term:", error)
      return null
    }
  }
}
