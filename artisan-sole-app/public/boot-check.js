/**
 * boot-check.js — Selbstheilung gegen "weiße Seite" nach einem Deploy.
 *
 * Läuft VOR dem Haupt-Bundle (klassisches Script, CSP 'self'-konform). Wenn ein
 * im Browser/CDN gecachtes index.html auf ein nicht mehr existierendes
 * Entry-Bundle zeigt, lädt das Bundle nicht und die App kann sich nicht selbst
 * (über die ErrorBoundary im Bundle) reparieren. Dieses Skript erkennt das und
 * lädt die Seite genau EINMAL mit Cache-Bust neu, sodass das frische
 * index.html samt aktuellem Bundle geholt wird.
 */
(function () {
  var KEY = '__as_boot_reload'
  function reloadedRecently() {
    try {
      var t = parseInt(sessionStorage.getItem(KEY) || '0', 10)
      return t && (Date.now() - t) < 30000
    } catch (e) { return false }
  }
  function mark() { try { sessionStorage.setItem(KEY, String(Date.now())) } catch (e) {} }
  function clear() { try { sessionStorage.removeItem(KEY) } catch (e) {} }
  function bustReload() {
    if (reloadedRecently()) return            // nur einmal pro 30s, kein Loop
    mark()
    try {
      if ('caches' in window) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k) }) })
    } catch (e) {}
    try {
      var u = new URL(window.location.href)
      u.searchParams.set('_v', Date.now().toString())
      window.location.replace(u.toString())
    } catch (e) { window.location.reload() }
  }

  // 1) Entry-Modul konnte nicht geladen werden (404 / falscher MIME / Netzwerk).
  window.addEventListener('error', function (e) {
    var t = e && e.target
    if (t && t.tagName === 'SCRIPT' && (t.type === 'module' || /\/assets\/index-.*\.js/.test(t.src || ''))) {
      bustReload()
    }
  }, true)

  // 2) Sicherheitsnetz: Wenn die App nach 8s nicht gemountet hat (root leer),
  //    neu laden. Bei erfolgreichem Mount die Reload-Marke zurücksetzen, damit
  //    künftige Deploys wieder selbstheilen können.
  window.addEventListener('load', function () {
    var settled = false
    var poll = setInterval(function () {
      var root = document.getElementById('root')
      if (root && root.childElementCount > 0) { settled = true; clear(); clearInterval(poll) }
    }, 250)
    setTimeout(function () {
      clearInterval(poll)
      if (settled) return
      var root = document.getElementById('root')
      if (root && root.childElementCount === 0) bustReload()
    }, 8000)
  })
})()
