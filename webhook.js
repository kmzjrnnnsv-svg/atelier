const http = require('http')
const crypto = require('crypto')
const { execSync } = require('child_process')

const PORT = 9000
const SECRET = process.env.WEBHOOK_SECRET || 'artisan-sole-webhook-secret-change-me'
// Muss auf dasselbe Verzeichnis zeigen wie deploy.sh ($HOME/as). Der frühere
// Festwert '/home/nrply/app' zeigte woanders hin — ein Deploy über den Webhook
// hätte dann ein anderes (oder gar kein) Arbeitsverzeichnis gebaut, während
// ~/as unverändert blieb.
const APP_DIR = process.env.APP_DIR || `${process.env.HOME || '/root'}/as`

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

    // Ein einziger Deploy-Weg: deploy.sh. Der eigene Ablauf hier hatte drei
    // Eigenschaften, die zusammen genau den Fehlerschirm „Seite kann nicht
    // geladen werden" erzeugen:
    //   • `npm run build` ohne erhöhtes Heap-Limit — auf einem 4-GB-Server
    //     bricht das three.js-Bündel mit „heap out of memory" ab.
    //   • Gebaut wurde direkt in das ausgelieferte dist/. Vite leert das
    //     Verzeichnis zu Beginn, ein Abbruch lässt die Seite also dauerhaft
    //     ohne ihre Chunks zurück — der Reload der ErrorBoundary kann das
    //     nicht heilen, weil die Dateien wirklich fehlen.
    //   • Die Assets des vorherigen Builds wurden nicht übernommen, offene
    //     Tabs liefen beim Nachladen alter Hashes ins Leere.
    // deploy.sh löst alle drei; hier nur noch anstoßen.
    try {
      execSync(`bash ${APP_DIR}/deploy.sh`, { stdio: 'inherit' })
      console.log('Deploy successful!')
    } catch (err) {
      console.error('Deploy failed:', err.message)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Webhook listener running on port ${PORT}`)
})
