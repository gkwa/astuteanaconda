default:
    @just --list

# Install dependencies
install:
    pnpm install

# Start development server
dev:
    pnpm run dev

# Build project for production
build:
    pnpm run build

# Preview production build
preview:
    pnpm run preview

# Clean dist directory
clean:
    rm -rf dist

# Initialize a new Vite project with pnpm
init:
    pnpm create vite@latest . --template vanilla
    @echo "Project initialized. Run 'just install' to install dependencies."

# Bundle and copy to clipboard for Chrome DevTools
bundle-for-devtools:
    pnpm run build
    cat dist/assets/index-*.js | pbcopy || cat dist/assets/index-*.js | xclip -selection clipboard
    @echo "Bundled JS copied to clipboard. Paste it into Chrome DevTools console or snippets."
