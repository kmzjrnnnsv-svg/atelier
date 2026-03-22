const http = require('http')
const crypto = require('crypto')
const { execSync } = require('child_process')

const PORT = 9000
const SECRET = process.env.WEBHOOK_SECRET || 'atelier-webhook-secret-change-me'
const APP_DIR = '/home/nrply/app'

function verifySignature(req, body) {
  const sig = req.headers['x-hub-signature-256']
  if (!sig) return false
  const hmac = crypto.createHmac('sha256', SECRET)
  hmac.update(body)
  const expected = 'sha256=' + hmac.digest('hex')
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404)
    return res.end('Not found')
  }

  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', () => {
    if (!verifySignature(req, body)) {
      console.log('Invalid signature — rejected')
      res.writeHead(403)
      return res.end('Forbidden')
    }

    const payload = JSON.parse(body)
    if (payload.ref !== 'refs/heads/website') {
      res.writeHead(200)
      return res.end('Not website branch — skipped')
    }

    console.log(`Deploy triggered by push from ${payload.pusher?.name}`)
    res.writeHead(200)
    res.end('Deploying...')

    try {
      execSync(`cd ${APP_DIR} && git pull origin website`, { stdio: 'inherit' })
      execSync(`cd ${APP_DIR}/atelier-app && npm install && npm run build`, { stdio: 'inherit' })
      execSync(`cd ${APP_DIR}/atelier-backend && npm install --production`, { stdio: 'inherit' })
      // Restart backend — adjust to your process manager (pm2/systemd)
      try { execSync('pm2 restart atelier', { stdio: 'inherit' }) } catch (_) {}
      try { execSync('systemctl restart atelier-backend', { stdio: 'inherit' }) } catch (_) {}
      console.log('Deploy successful!')
    } catch (err) {
      console.error('Deploy failed:', err.message)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Webhook listener running on port ${PORT}`)
})
