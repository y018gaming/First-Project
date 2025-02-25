// proxy-server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Create HTML file for the proxy interface
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Proxy</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .nav-bar {
      background-color: #f1f1f1;
      padding: 10px;
      display: flex;
      gap: 10px;
      align-items: center;
      border-bottom: 1px solid #ddd;
    }
    .url-bar {
      flex-grow: 1;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .submit-btn {
      padding: 8px 16px;
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .submit-btn:hover {
      background-color: #357ae8;
    }
    .search-bar {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-right: 10px;
    }
    iframe {
      flex-grow: 1;
      border: none;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="nav-bar">
    <input type="text" class="url-bar" id="urlBar" placeholder="Enter URL (e.g., https://www.example.com)">
    <button class="submit-btn" id="goBtn">Go</button>
    <input type="text" class="search-bar" id="searchBar" placeholder="Search Google">
    <button class="submit-btn" id="searchBtn">Search</button>
  </div>
  <iframe id="contentFrame" src="/proxy/https://www.google.com"></iframe>

  <script>
    document.getElementById('goBtn').addEventListener('click', () => {
      navigateToUrl();
    });

    document.getElementById('urlBar').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        navigateToUrl();
      }
    });

    document.getElementById('searchBtn').addEventListener('click', () => {
      searchGoogle();
    });

    document.getElementById('searchBar').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchGoogle();
      }
    });

    function navigateToUrl() {
      let url = document.getElementById('urlBar').value.trim();
      
      // Add protocol if missing
      if (!/^https?:\\/\\//.test(url)) {
        url = 'https://' + url;
      }
      
      document.getElementById('contentFrame').src = '/proxy/' + url;
    }

    function searchGoogle() {
      const query = encodeURIComponent(document.getElementById('searchBar').value.trim());
      document.getElementById('contentFrame').src = '/proxy/https://www.google.com/search?q=' + query;
    }

    // Update URL bar when iframe loads a new URL
    document.getElementById('contentFrame').addEventListener('load', () => {
      const frameSrc = document.getElementById('contentFrame').src;
      if (frameSrc.startsWith(window.location.origin + '/proxy/')) {
        const actualUrl = frameSrc.replace(window.location.origin + '/proxy/', '');
        document.getElementById('urlBar').value = actualUrl;
      }
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);

// Serve static files
app.use(express.static(publicDir));

// Main proxy middleware
app.use('/proxy/:proxyUrl(*)', (req, res, next) => {
  const proxyUrl = req.params.proxyUrl;
  
  // Parse the target URL
  let target;
  try {
    target = new URL(proxyUrl);
  } catch (error) {
    return res.status(400).send('Invalid URL format');
  }

  // Create a proxy for the specific request
  const proxy = createProxyMiddleware({
    target: target.origin,
    changeOrigin: true,
    pathRewrite: (path) => {
      // Remove the '/proxy/https://example.com' part, keep the rest of the path
      return path.replace(`/proxy/${target.origin}`, '') || '/';
    },
    onProxyRes: (proxyRes, req, res) => {
      // Modify headers to handle CORS issues
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['X-Frame-Options'];
      delete proxyRes.headers['content-security-policy'];
      delete proxyRes.headers['Content-Security-Policy'];
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error: ' + err.message);
    }
  });

  return proxy(req, res, next);
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
