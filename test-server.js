const http = require('http');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  if (req.url === '/api/health' || req.url === '/api/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Job Analyzer Test Server Running');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on http://0.0.0.0:${port}`);
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
    JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set'
  });
});