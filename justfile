# Justfile for AstuteAnaconda Chrome Extension

# Default recipe
default:
    @just --list

# Install dependencies
install:
    pnpm add socialsparrow
    pnpm add -D webpack webpack-cli copy-webpack-plugin eslint

# Build the extension
build:
    pnpm run build

# Watch for changes and rebuild
watch:
    pnpm run watch

# Clean build artifacts
clean:
    rm -rf dist

# Build and package the extension
package: clean build
    mkdir -p packages
    cd dist && zip -r ../packages/astuteanaconda-product-extractor.zip .

# Set up the development environment
setup: install build
    @echo "Extension built successfully. Load the 'dist' folder in Chrome extensions page."

# Run all checks
check:
    pnpm run lint
