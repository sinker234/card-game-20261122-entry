// Ember Court — local static server for play-testing (Node 22, stdlib only).
// Serves game/ at http://localhost:8080 and opens it in the default browser.
//
//   node serve.ts [port]

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const gameDir = fileURLToPath(new URL('./game', import.meta.url));
const port = Number(process.argv[2] || 8080);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let filePath = join(gameDir, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(gameDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found\n');
    return;
  }
  res.writeHead(200, { 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}`;
  console.log(`Ember Court at ${url}`);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${opener} ${url}`, () => {});
});
