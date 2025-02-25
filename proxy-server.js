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
  <iframe id="contentFrame" src="/proxy/https/www.google.com"></iframe>

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
      
      // Parse URL to get components
      try {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol.replace(':', '');
        const host = urlObj.host;
        const pathname = urlObj.pathname || '';
        const search = urlObj.search || '';
        const proxyUrl = '/proxy/' + protocol + '/' + host + pathname + search;
        document.getElementById('contentFrame').src = proxyUrl;
      } catch (e) {
        alert('Invalid URL format');
      }
    }

    function searchGoogle() {
      const query = encodeURIComponent(document.getElementById('searchBar').value.trim());
      document.getElementById('contentFrame').src = '/proxy/https/www.google.com/search?q=' + query;
    }

    // Update URL bar when iframe loads a new URL
    document.getElementById('contentFrame').addEventListener('load', () => {
      const frameSrc = document.getElementById('contentFrame').src;
      if (frameSrc.startsWith(window.location.origin + '/proxy/')) {
        try {
          // Extract the actual URL from the proxy URL
          const proxyPath = frameSrc.replace(window.location.origin + '/proxy/', '');
          const parts = proxyPath.split('/');
          
          // First part is the protocol (http or https)
          const protocol = parts[0] + ':';
          
          // Second part is the host
          const host = parts[1];
          
          // Rest is the path (if any)
          let path = '';
          if (parts.length > 2) {
            path = '/' + parts.slice(2).join('/');
          }
          
          const actualUrl = protocol + '//' + host + path;
          document.getElementById('urlBar').value = actualUrl;
        } catch (e) {
          console.error('Error parsing proxy URL', e);
        }
      }
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);

// Serve static files
app.use(express.static(publicDir));

// Function to create proxy middleware with consistent options
function createProxyWithOptions(protocol, host, pathRewriter) {
  return createProxyMiddleware({
    target: `${protocol}://${host}`,
    changeOrigin: true,
    followRedirects: true,
    pathRewrite: pathRewriter,
    onProxyRes: (proxyRes, req, res) => {
      // Modify headers to handle CORS issues
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['X-Frame-Options'];
      delete proxyRes.headers['content-security-policy'];
      delete proxyRes.headers['Content-Security-Policy'];
      
      // HTML content modification to rewrite links
      if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
        let body = '';
        const _write = res.write;
        const _end = res.end;
        
        proxyRes.on('data', (chunk) => {
          body += chunk;
        });
        
        proxyRes.on('end', () => {
          try {
            // Rewrite links in HTML
            const modifiedBody = body
              .replace(/href="http(s?):\/\//g, `href="/proxy/http$1/`)
              .replace(/href="\/(?!proxy)/g, `href="/proxy/${protocol}/${host}/`)
              .replace(/src="http(s?):\/\//g, `src="/proxy/http$1/`)
              .replace(/src="\/(?!proxy)/g, `src="/proxy/${protocol}/${host}/`)
              .replace(/action="http(s?):\/\//g, `action="/proxy/http$1/`)
              .replace(/action="\/(?!proxy)/g, `action="/proxy/${protocol}/${host}/`)
              .replace(/url\(http(s?):\/\//g, `url(/proxy/http$1/`)
              .replace(/url\('http(s?):\/\//g, `url('/proxy/http$1/`)
              .replace(/url\("http(s?):\/\//g, `url("/proxy/http$1/`)
              .replace(/url\(\/(?!proxy)/g, `url(/proxy/${protocol}/${host}/`);
            
            // Send the modified HTML
            _write.call(res, Buffer.from(modifiedBody));
            _end.call(res);
          } catch (e) {
            console.error('Error modifying response:', e);
            _write.call(res, Buffer.from(body));
            _end.call(res);
          }
        });
        
        // Prevent original response from being sent
        res.write = () => true;
        res.end = () => true;
      }
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error: ' + err.message);
    }
  });
}

// Handle root requests to a domain (no path specified)
app.use('/proxy/:protocol/:host', (req, res, next) => {
  const protocol = req.params.protocol;
  const host = req.params.host;
  
  console.log(`Proxying to: ${protocol}://${host}/`);
  
  const proxy = createProxyWithOptions(protocol, host, () => '/');
  return proxy(req, res, next);
});

// Proxy middleware for fully qualified URLs with paths
app.use('/proxy/:protocol/:host/*', (req, res, next) => {
  const protocol = req.params.protocol;
  const host = req.params.host;
  const path = req.params[0];
  
  console.log(`Proxying to: ${protocol}://${host}/${path}`);
  
  // Create a proxy for the specific request
  const proxy = createProxyWithOptions(protocol, host, () => '/' + path);
  return proxy(req, res, next);
});

// Handle legacy format or direct URLs
app.use('/proxy/:url(*)', (req, res) => {
  let url = req.params.url;
  
  if (!url.includes('://')) {
    url = 'https://' + url;
  }
  
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol.replace(':', '');
    const host = urlObj.host;
    const pathname = urlObj.pathname || '/';
    const search = urlObj.search || '';
    
    // Redirect to the new format
    res.redirect(`/proxy/${protocol}/${host}${pathname}${search}`);
  } catch (error) {
    res.status(400).send('Invalid URL format');
  }
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
