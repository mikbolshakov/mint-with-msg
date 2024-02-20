const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.cert'))
};

https.createServer(httpsOptions, app).listen(3000, () => {
  console.log('HTTPS server running on port 3000');
});
