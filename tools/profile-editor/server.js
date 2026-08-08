const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PROFILE_GLOB = process.env.PROFILE_PATH || path.join(__dirname, '..', '..', 'parsed', 'Rex_CV_20260712__Research_.aiclient2026-08-07T14-38-38-832Z.profile.json');

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) return res.writeHead(404).end('Not found');
    res.writeHead(200, {'Content-Type': contentType});
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  if (parsedUrl.pathname === '/') {
    sendFile(res, path.join(__dirname, 'index.html'), 'text/html');
    return;
  }
  if (parsedUrl.pathname === '/app.js') {
    sendFile(res, path.join(__dirname, 'app.js'), 'application/javascript');
    return;
  }
  if (parsedUrl.pathname === '/profile' && req.method === 'GET') {
    fs.readFile(PROFILE_GLOB, 'utf8', (err, data) => {
      if (err) return res.writeHead(500).end(JSON.stringify({error: 'profile not found', path: PROFILE_GLOB}));
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(data);
    });
    return;
  }
  if (parsedUrl.pathname === '/profile' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const obj = JSON.parse(body);
        fs.writeFile(PROFILE_GLOB, JSON.stringify(obj, null, 2), 'utf8', (err) => {
          if (err) return res.writeHead(500).end(JSON.stringify({error:'write failed'}));
          res.writeHead(200, {'Content-Type':'application/json'});
          res.end(JSON.stringify(obj));
        });
      } catch (e) {
        res.writeHead(400).end(JSON.stringify({error:'invalid json'}));
      }
    });
    return;
  }
  if (parsedUrl.pathname === '/rawfile') {
    res.writeHead(200, {'Content-Type':'text/plain'});
    fs.createReadStream(PROFILE_GLOB).pipe(res);
    return;
  }

  res.writeHead(404).end('Not found');
});

server.listen(PORT, () => console.log(`Profile editor running at http://localhost:${PORT}/\nEditing: ${PROFILE_GLOB}`));

