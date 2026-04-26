const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from the sample app!\n');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Sample app listening on port ${port}`);
});
