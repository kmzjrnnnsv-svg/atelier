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
  /**
   * Wenn auch der zweite Anlauf nichts zeigt, bleibt sonst eine weiße Seite
   * stehen — das Haupt-Bündel ist nicht da, also kann auch die Meldung der
   * Anwendung nicht erscheinen. Diese hier kommt ohne sie aus: schlichtes
   * DOM, keine Abhängigkeit, die ihrerseits geladen werden müsste.
   */
  function zeigeMeldung() {
    var wurzel = document.getElementById('root')
    if (!wurzel || wurzel.childElementCount > 0) return
    wurzel.innerHTML =
      '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;text-align:center;padding:0 2rem;font-family:system-ui,sans-serif;background:#fff">' +
      '<p style="letter-spacing:.3em;font-size:13px;color:#111;margin-bottom:2.5rem">ARTISAN SOLE</p>' +
      '<p style="font-size:19px;color:#111;margin:0 0 .75rem">Der Laden lädt gerade nicht</p>' +
      '<p style="font-size:14px;color:#9ca3af;line-height:1.6;max-width:20rem;margin:0 0 2rem">' +
      'Ein Teil der Seite kam nicht durch — meist liegt es an einer kurz unterbrochenen Verbindung.</p>' +
      '<button id="as-neu" style="background:#000;color:#fff;font-size:12px;letter-spacing:.15em;' +
      'text-transform:uppercase;padding:1rem 2rem;border:0;border-radius:8px">Nochmal versuchen</button>' +
      '</div>'
    var knopf = document.getElementById('as-neu')
    if (knopf) knopf.addEventListener('click', function () { clear(); bustReload() })
  }

  function bustReload() {
    if (reloadedRecently()) { zeigeMeldung(); return }   // nur einmal pro 30s, kein Loop
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
