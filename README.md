# Web Proxy for GitHub Codespaces

This is a simple web proxy that can be run in GitHub Codespaces. It allows you to browse websites including YouTube and Google Search through the proxy server.

## Features

- Access various websites through the proxy
- Integrated URL bar for navigation
- Google Search functionality
- Clean and simple interface
- Runs in GitHub Codespaces

## Setup Instructions

1. **Clone this repository to your GitHub account**

2. **Open in GitHub Codespaces**
   - Click on the "Code" button in your repository
   - Select "Open with Codespaces"
   - Click "New codespace"

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the proxy server**
   ```bash
   npm start
   ```

5. **Access the proxy**
   - Once the server is running, Codespaces will provide you with a forwarded port link
   - Click on the link or go to the "Ports" tab and click on the provided URL for port 3000

## Usage

1. **Enter a URL**
   - Type a URL in the URL bar and click "Go" or press Enter
   - The page will load in the frame below

2. **Search Google**
   - Enter a search term in the search box and click "Search" or press Enter
   - Google search results will appear in the frame

## Important Notes

- Some websites may block proxies or have Content Security Policy (CSP) that prevents them from loading in an iframe
- This proxy is intended for personal use and educational purposes only
- Be mindful of the terms of service of websites you access through the proxy

## Customization

You can modify the `proxy-server.js` file to add additional features or change the behavior of the proxy.

## License

MIT
