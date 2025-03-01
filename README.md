# Figma AI Layout Generator

A Figma plugin that uses AI to automatically generate layouts based on Product Requirement Documents (PRDs).

## Features

- Convert text-based PRDs into structured layouts
- Integrate with your existing design system components
- Auto-generate responsive layouts with proper spacing
- Secure proxy server for OpenAI API integration
- Rate limiting to manage API usage

## Installation

1. Clone the repository:
```bash
git clone https://github.com/lucianocassan92/figma-ai-layout-generator.git
```

2. Install dependencies:
```bash
npm install
```

3. Build the plugin:
```bash
npm run build
```

## Project Structure

- `code.ts` - Main plugin code
- `ui.html` - Plugin UI interface
- `manifest.json` - Figma plugin configuration
- `dist/` - Compiled plugin files

## Usage

1. Create components in your Figma file that match these types:
   - header
   - sidebar
   - card
   - footer
   (The plugin will look for these component names)

2. Enter your PRD in the plugin's text area. Example:
```
A dashboard layout with:
- Header with user profile
- Sidebar navigation
- Main content area with:
  - Statistics cards in a grid
  - Recent activity list
- Footer with copyright
```

3. Click "Generate Layout" to create your design

## Development

- `npm run build` - Build the plugin
- `npm run watch` - Watch for changes and rebuild

## Architecture

- Frontend: Figma Plugin UI (HTML/CSS/TypeScript)
- Backend: Node.js proxy server hosted on Vercel
- AI: OpenAI GPT-4 for PRD analysis

## Security

- API keys are securely stored on the server
- CORS protection enabled
- Rate limiting implemented
- Request validation and sanitization

## License

ISC License 