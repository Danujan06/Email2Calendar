# Email2Calendar Chrome Extension

An AI-powered Chrome extension that automatically extracts calendar events from Gmail emails and adds them to Google Calendar.

## Features

- 🤖 **AI-Powered Event Extraction**: Uses advanced NLP to understand natural language
- 📧 **Gmail Integration**: Seamlessly works within Gmail interface
- 📅 **Google Calendar Sync**: Direct integration with Google Calendar API
- 🔒 **Privacy-First**: Local processing options available
- ⚙️ **Customizable**: Extensive configuration options
- 🌙 **Dark Mode**: Supports system dark mode preferences

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. Configure your Google OAuth credentials in `manifest.json`

## Configuration

1. Visit the extension options page
2. Configure your AI provider (OpenAI, Anthropic, or local processing)
3. Set up your API keys if using external AI services
4. Customize detection settings and preferences

## File Structure
## Development

```bash
# Install development dependencies
npm install

# Run linting
npm run lint

# Run tests
npm run test

# Build for production
npm run build

# Create distribution zip
npm run zip