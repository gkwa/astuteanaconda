# AstuteAnaconda Product Extractor

A Chrome extension that extracts product data from web pages using the SocialSparrow API and saves it to an AWS DynamoDB table.

## Features

- Extract product data from various e-commerce websites
- Transform product data to fit the DynamoDB schema
- Batch write products to DynamoDB in chunks of 25 items
- Options page for configuring AWS credentials

## Setup

1. Clone this repository
2. Install dependencies with `pnpm install`
3. Build the extension with `pnpm run build`
4. Load the `dist` folder as an unpacked extension in Chrome
5. Configure your AWS credentials in the extension options

## Usage

1. Navigate to a product listing page on an e-commerce website
2. Click the extension icon to open the popup
3. Click "Extract Products" to view products in the console
4. Click "Extract & Save to DynamoDB" to save products to your DynamoDB table

## Requirements

- AWS credentials with permissions to write to DynamoDB
- DynamoDB table named "dreamydungbeetle" with the schema defined in the main.tf file

## Development

- Run `pnpm run watch` to automatically rebuild when files change
- Use `pnpm run lint` to check for code issues

## License

MIT
