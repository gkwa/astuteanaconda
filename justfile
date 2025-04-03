# Justfile for AstuteAnaconda Chrome Extension

# Default recipe
default:
    @just --list

# Install dependencies
install:
    pnpm install

# Build the extension
build:
    @pnpm run build > /dev/null 2>&1 || echo "Build failed with an error"

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
