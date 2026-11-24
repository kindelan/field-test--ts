import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = '127.0.0.1';
const PORT = 3000;

const ALLOWED_ROOTS = [
  path.resolve(__dirname, 'pages'),
  path.resolve(__dirname, 'dist'),
  path.resolve(__dirname, 'assets'),
];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const ROUTE_MAP = {
  '/': 'pages/index.html',
  '/index.html': 'pages/index.html',
  '/bikes': 'pages/bikes.html',
  '/bikes.html': 'pages/bikes.html',
  '/ft': 'pages/ft.html',
  '/ft.html': 'pages/ft.html',
  '/import': 'pages/import.html',
  '/import.html': 'pages/import.html',
  '/form': 'pages/form.html',
  '/form.html': 'pages/form.html',
  '/questions': 'pages/questions.html',
  '/questions.html': 'pages/questions.html',
  '/finance': 'pages/finance.html',
  '/finance.html': 'pages/finance.html',
  '/login': 'pages/login.html',
  '/login.html': 'pages/login.html',
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

function isInsideAllowedRoot(resolvedPath) {
  return ALLOWED_ROOTS.some(
    (root) => resolvedPath === root || resolvedPath.startsWith(root + path.sep)
  );
}

function resolveSafeFilePath(rawUrl) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawUrl.split('?')[0]);
  } catch {
    return null;
  }

  // Block null bytes, backslashes, traversal segments, and hidden dotfiles
  if (
    decodedPath.includes('\0') ||
    decodedPath.includes('\\') ||
    decodedPath.split('/').some((seg) => seg === '..' || seg.startsWith('.'))
  ) {
    return null;
  }

  if (ROUTE_MAP[decodedPath]) {
    return path.resolve(__dirname, ROUTE_MAP[decodedPath]);
  }

  const relativePath = decodedPath.replace(/^\/+/, '');
  const candidate = path.resolve(__dirname, relativePath);
  if (isInsideAllowedRoot(candidate)) {
    return candidate;
  }

  // Fallback inside pages/ only if strictly contained within pages/
  const pagesCandidate = path.resolve(__dirname, 'pages', relativePath);
  if (isInsideAllowedRoot(pagesCandidate)) {
    return pagesCandidate;
  }

  return null;
}

http.createServer((req, res) => {
  const safePath = resolveSafeFilePath(req.url || '/');
  if (!safePath) {
    res.writeHead(403, { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>403 Forbidden</h1>');
    return;
  }

  const extname = String(path.extname(safePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(safePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT' || error.code === 'EISDIR') {
        res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      }
      return;
    }

    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': contentType });
    res.end(content);
  });
}).listen(PORT, HOST);

console.log(`\n=== Servidor local de pruebas ===`);
console.log(`Disponible en: http://${HOST}:${PORT}/bikes.html`);
console.log(`Presiona Ctrl+C para detener el servidor.\n`);
