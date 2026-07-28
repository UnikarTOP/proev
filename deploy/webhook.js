const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');

const SECRET = process.env.WEBHOOK_SECRET || 'change-me';
const PORT = 9000;
const REPO_DIR = '/home/unikar/proev';
const INFRA_DIR = '/home/unikar/proev/infra';

function log(msg) { console.log('[' + new Date().toISOString() + '] ' + msg); }

function verify(req, body) {
  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
  catch(e) { return false; }
}

function deploy() {
  log('=== Начинаем деплой ===');
  var cmd = 'cd ' + REPO_DIR + ' && git fetch origin && git reset --hard origin/main && cd ' + INFRA_DIR + ' && docker compose build --no-cache && docker compose up -d';
  exec(cmd, { timeout: 600000 }, function(err, stdout, stderr) {
    if (err) log('Ошибка: ' + err.message);
    else log('=== Деплой завершён ===');
  });
}

http.createServer(function(req, res) {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    return res.end('Not found');
  }
  var body = '';
  req.on('data', function(c) { body += c; });
  req.on('end', function() {
    if (!verify(req, body)) { res.writeHead(401); return res.end('Unauthorized'); }
    var payload;
    try { payload = JSON.parse(body); } catch(e) { res.writeHead(400); return res.end('Bad JSON'); }
    var event = req.headers['x-github-event'];
    if (event === 'push' && payload.ref === 'refs/heads/main') {
      log('Push — запускаем деплой');
      res.writeHead(200);
      res.end('Deploying...');
      setTimeout(deploy, 100);
    } else {
      res.writeHead(200);
      res.end('Ignored');
    }
  });
}).listen(PORT, '0.0.0.0', function() {
  log('Webhook сервер запущен на порту ' + PORT);
});
