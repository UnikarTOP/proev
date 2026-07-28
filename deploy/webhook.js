const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');

const SECRET = process.env.WEBHOOK_SECRET || 'change-me';
const PORT = 9000;
const REPO_DIR = '/home/unikar/proev';
const INFRA_DIR = '/home/unikar/proev/infra';

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function verify(req, body) {
  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch { return false; }
}

function deploy() {
  log('=== Начинаем деплой ===');
  const cmd = [
    `cd ${REPO_DIR} && git fetch origin && git reset --hard origin/main`,
    `cd ${INFRA_DIR} && docker compose build --no-cache`,
    `cd ${INFRA_DIR} && docker compose up -d`,
    `sleep 15 && cd ${INFRA_DIR} && docker compose exec -T backend npm run seed 2>/dev/null || true`,
  ].join(' && ');

  exec(cmd, { timeout: 600000 }, (err, stdout, stderr) => {
    if (err) {
      log(`Ошибка деплоя: ${err.message}`);
    } else {
      log('=== Деплой завершён успешно ===');
    }
    if (stdout) log(stdout.slice(-500));
    if (stderr) log('STDERR: ' + stderr.slice(-200));
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
  }

  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    return res.end('Not found');
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    if (!verify(req, body)) {
      log('Неверная подпись webhook — отклонено');
      res.writeHead(401);
      return res.end('Unauthorized');
    }

    let payload;
    try { payload = JSON.parse(body); } catch {
      res.writeHead(400); return res.end('Bad JSON');
    }

    const event = req.headers['x-github-event'];
    log(`GitHub event: ${event}, ref: ${payload.ref}`);

    if (event === 'push' && payload.ref === 'refs/heads/main') {
      const pusher = payload.pusher?.name || 'unknown';
      const commits = payload.commits?.length || 0;
      log(`Push от ${pusher}: ${commits} коммит(ов) — запускаем деплой`);
      res.writeHead(200);
      res.end('Deploying...');
      setImmediate(deploy);
    } else {
      res.writeHead(200);
      res.end('Ignored');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  log(`Webhook сервер слушает порт ${PORT}`);
  log(`Health check: http://localhost:${PORT}/health`);
});
