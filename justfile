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

# Set up the development environment
setup: install build
    @echo "Extension built successfully. Load the 'dist' folder in Chrome extensions page."

# Run all checks
check:
    pnpm run lint

# Clean build artifacts
clean:
    rm -rf dist
