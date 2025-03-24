import { BaseSearchParamExtractor } from "./base-search-param-extractor.js"

/**
 * Walmart specific search parameter extractor
 */
export class WalmartSearchParamExtractor extends BaseSearchParamExtractor {
  /**
   * Extract search parameter from Walmart URL
   * @param {string} url - URL to extract from
   * @return {string|null} Extracted search term or null if not found
   */
  extractSearchTerm(url) {
    try {
      if (!url) return null

      // Check for direct query parameter
      const urlObj = new URL(url)

      // First, try the obvious search parameter 'q'
      const qParam = urlObj.searchParams.get("q")
      if (qParam) return qParam

      // For tracking URLs, check the page ID which often contains the search term
      const pgId = urlObj.searchParams.get("pgId")
      if (pgId) return pgId

      // Check redirected URLs that might contain the search term
      const redirectUrl = urlObj.searchParams.get("rd")
      if (redirectUrl) {
        try {
          // Parse the redirect URL
          const redirectObj = new URL(redirectUrl)

          // Try to get the search parameter from the redirect URL
          const redirectQ = redirectObj.searchParams.get("q")
          if (redirectQ) return redirectQ

          // Check if the search term is in the path
          const pathParts = redirectObj.pathname.split("/")
          // The last part of a path might be a product ID, so check the one before if it exists
          if (pathParts.length > 2) {
            // Check if the second-to-last part might be a search term
            const potentialSearchTerm = pathParts[pathParts.length - 2]
            if (
              potentialSearchTerm &&
              !potentialSearchTerm.includes(".") &&
              potentialSearchTerm !== "ip"
            ) {
              return potentialSearchTerm
            }
          }
        } catch (redirectError) {
          console.error("Error parsing redirect URL:", redirectError)
        }
      }

      // Also look in the pathname for search patterns like "/search/walnuts"
      const pathParts = urlObj.pathname.split("/")
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (pathParts[i] === "search" || pathParts[i] === "s" || pathParts[i] === "sp") {
          return pathParts[i + 1]
        }
      }

      return null
    } catch (error) {
      console.error("Error extracting Walmart search term:", error)
      return null
    }
  }
}
