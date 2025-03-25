/**
 * Shared schema definitions for AstuteAnaconda
 * This file centralizes the data structure used across the extension
 */

// Product schema for consistency across the extension
export const PRODUCT_SCHEMA = {
  // Function to format a product according to our schema
  formatProduct: (product) => ({
    name: product.name || product.title || "Unknown Product",
    brand: product.brand || "Unknown Brand",
    url: product.url || window.location.href,
    price: product.price || "",
    imageUrl: product.imageUrl || product.image || "",
    size: product.size || "N/A",
    rawTextContent: product.rawTextContent || product.description || "",
    timestamp: product.timestamp || new Date().toISOString(),
    search: product.search || "",
  }),

  // Function to create a DynamoDB item from a product
  createDynamoDBItem: (product, currentDate) => {
    const formattedProduct = PRODUCT_SCHEMA.formatProduct(product);
    const timestamp = formattedProduct.timestamp;
    const timeComponent = timestamp.split("T")[1].split(".")[0] + "Z";
    const productName = (formattedProduct.name).replace(/\s+/g, "-");

    return {
      PK: `STAGE#RAW#${currentDate}`,
      SK: `${timeComponent}#${productName}`,
      Stage: "raw",
      CreatedAt: timestamp,
      OriginalTimestamp: timestamp,
      ProductName: productName,
      ProductData: formattedProduct,
      ExpiryTime: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days TTL
    };
  }
};

// Search utility functions
export const SEARCH_UTILS = {
  // Function to extract search query from URL
  extractSearchQuery: () => {
    console.log("DEBUGGING: Extracting search query from URL");
    const url = new URL(window.location.href);
    
    // Common search parameter names used by e-commerce sites
    const searchParams = ['q', 'query', 'search', 'keyword', 'searchTerm', 'term', 'p', 's', 'k'];
    
    for (const param of searchParams) {
      if (url.searchParams.has(param)) {
        const query = url.searchParams.get(param);
        console.log(`DEBUGGING: Found search query: ${query}`);
        return query;
      }
    }
    
    // Check for search in URL path (e.g., /search/black-beans)
    if (url.pathname.includes('/search/')) {
      const pathParts = url.pathname.split('/search/');
      if (pathParts.length > 1) {
        const searchTerm = pathParts[1].replace(/-/g, ' ').trim();
        console.log(`DEBUGGING: Found search in URL path: ${searchTerm}`);
        return searchTerm;
      }
    }
    
    console.log("DEBUGGING: No search query found in URL");
    return null;
  }
};

export default {
  PRODUCT_SCHEMA,
  SEARCH_UTILS
};
```

```
