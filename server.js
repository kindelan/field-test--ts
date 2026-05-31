const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

http.createServer((req, res) => {
  // Clean query parameters from URL
  const cleanUrl = req.url.split('?')[0];
  
  let filePath = '.' + cleanUrl;
  
  // Routes mapping
  if (cleanUrl === '/' || cleanUrl === '/index.html') {
    filePath = './pages/index.html';
  } else if (cleanUrl === '/bikes' || cleanUrl === '/bikes.html') {
    filePath = './pages/bikes.html';
  } else if (cleanUrl === '/ft' || cleanUrl === '/ft.html') {
    filePath = './pages/ft.html';
  } else if (cleanUrl === '/import' || cleanUrl === '/import.html') {
    filePath = './pages/import.html';
  } else if (cleanUrl === '/form' || cleanUrl === '/form.html') {
    filePath = './pages/form.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Fallback: look in the pages directory if not found at root
        const fallbackPath = path.join(__dirname, 'pages', cleanUrl);
        fs.readFile(fallbackPath, (fallbackError, fallbackContent) => {
          if (fallbackError) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>', 'utf-8');
          } else {
            const fallbackExt = String(path.extname(fallbackPath)).toLowerCase();
            res.writeHead(200, { 'Content-Type': mimeTypes[fallbackExt] || 'text/html' });
            res.end(fallbackContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}).listen(PORT);

console.log(`\n=== Servidor local de pruebas ===`);
console.log(`Disponible en: http://localhost:${PORT}/bikes.html`);
console.log(`Presiona Ctrl+C para detener el servidor.\n`);
