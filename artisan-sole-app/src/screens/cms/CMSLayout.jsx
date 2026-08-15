import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Footprints, Image, ImagePlus, LogOut, Users, Shield, ScanLine, HelpCircle, FileText, ShoppingBag, ShieldCheck, Landmark, Mail, Ruler, Palette, Award, MessageSquare, Truck, Ticket, Gift, Megaphone, ExternalLink, Sliders, Building2, Smartphone, ChevronRight, Inbox, PackageOpen, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import useStore from '../../store/store'
import { HOME_PATH } from '../../lib/homePath'
import { apiFetch } from '../../hooks/useApi'

export default function CMSLayout() {
  const navigate = useNavigate()
  const { pathname: pfad } = useLocation()
  const { user, logout } = useAuth()
  const { shoes, initStore, resetToDefaults } = useStore()

  // Ungelesene Nachrichten. Regelmäßig nachfragen, damit eine Antwort nicht
  // erst beim nächsten Seitenwechsel auffällt — der Bereich wird oft lange
  // offen gelassen, ohne dass jemand neu lädt.
  const [ungelesen, setUngelesen] = useState(0)
  useEffect(() => {
    let aktiv = true
    const holen = () => apiFetch('/api/chat/ungelesen')
      .then(d => { if (aktiv) setUngelesen(d?.gesamt || 0) })
      .catch(() => {})
    holen()
    const t = setInterval(holen, 45000)
    return () => { aktiv = false; clearInterval(t) }
  }, [])

  useEffect(() => { initStore() }, [])

  /**
   * Welche Gruppen zugeklappt sind.
   *
   * Gemerkt wird, was ZU ist, nicht was offen ist: Kommt später eine Gruppe
   * dazu, ist sie damit von selbst sichtbar. Andersherum wäre sie unsichtbar,
   * bis jemand sie sucht — und suchen kann man nur, was man kennt.
   */
  const [zu, setZu] = useState(() => {
    try { const l = JSON.parse(localStorage.getItem('cms_nav_zu') || '[]'); return Array.isArray(l) ? l : [] }
    catch { return [] }
  })
  const umschalten = (heading) => setZu(l => {
    const neu = l.includes(heading) ? l.filter(x => x !== heading) : [...l, heading]
    try { localStorage.setItem('cms_nav_zu', JSON.stringify(neu)) } catch { /* ohne Speicher gilt es für diese Sitzung */ }
    return neu
  })
  // Die Gruppe, in der man gerade steht, bleibt offen — sonst klappte die
  // Navigation den eigenen Standort weg.
  const aktiv = (i) => i.end ? pfad === i.to : pfad.startsWith(i.to)

  const handleLogout = () => {
    // Vollständiger Seitenwechsel statt Router-Navigation. Beim Abmelden
    // rendern die geschützten Hüllen sonst noch einmal ohne Benutzer und
    // schicken einen auf die Anmeldemaske, bevor der Wechsel greift — der
    // Nutzer landete trotz allem auf /login. Der Neuaufbau räumt außerdem
    // jeden im Speicher gehaltenen Zustand mit ab, was beim Abmelden
    // ohnehin das Gewünschte ist.
    logout()
    window.location.replace(HOME_PATH)
  }

  return (
    <div className="flex bg-white text-black" style={{ width: '100%', height: '100%', maxWidth: '100vw', maxHeight: '100dvh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-[#111] flex flex-col">

        {/* Logo */}
        <div className="px-7 pt-8 pb-6">
          <p className="font-brand text-[11px] text-white/90">ARTISAN SOLE</p>
          <p className="text-[9px] text-white/20 tracking-[0.2em] uppercase mt-1 font-light">Content Studio</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 pb-4 overflow-y-auto" data-keep-scroll>
          {[
            { heading: null, items: [
              { to: '/cms', label: 'Dashboard', icon: LayoutDashboard, end: true },
            ]},
            { heading: 'Produkte', items: [
              { to: '/cms/shoes',          label: 'Schuhe',           icon: Footprints },
              { to: '/cms/product-config', label: 'Produkt-Konfig',   icon: Palette },
              { to: '/cms/options',        label: 'Konfigurator-Optionen', icon: Sliders },
              { to: '/cms/matrix',         label: 'Modell-Matrix',        icon: LayoutDashboard },
              { to: '/cms/leisten',        label: 'Leisten-Parameter', icon: Ruler },
              { to: '/cms/accessories',    label: 'Zubehör',          icon: Gift },
            ]},
            { heading: 'Bestellungen', items: [
              { to: '/cms/nachrichten', label: 'Nachrichten', icon: MessageSquare, badge: ungelesen },
              { to: '/cms/orders',   label: 'Bestellungen', icon: ShoppingBag },
              { to: '/cms/zahlungen', label: 'Zahlungseingang', icon: Landmark },
              { to: '/cms/shipping', label: 'Versand',      icon: Truck },
              { to: '/cms/ruecksendungen', label: 'Rücksendungen', icon: PackageOpen },
              { to: '/cms/coupons',  label: 'Gutscheine',   icon: Ticket },
            ]},
            { heading: 'Inhalte', items: [
              { to: '/cms/cta-banner', label: 'CTA-Banner',     icon: Megaphone },
              { to: '/cms/product-texts', label: 'Produktseite-Texte', icon: FileText },
              { to: '/cms/footer',     label: 'Footer & Service', icon: FileText },
              { to: '/cms/website-images', label: 'Website-Bilder',  icon: Image },
              { to: '/cms/media',      label: 'Mediathek',        icon: ImagePlus },
            ]},
            { heading: 'Auswertung', items: [
              { to: '/cms/auswertung', label: 'Zahlen & Protokoll', icon: TrendingUp },
            ]},
            { heading: 'Kunden', items: [
              { to: '/cms/scans',    label: 'Foot Scans',   icon: ScanLine },
              { to: '/cms/loyalty',  label: 'Loyalty & Tiers', icon: Award },
              { to: '/cms/feedback', label: 'Feedback & Tickets', icon: MessageSquare },
            ]},
            // Firmenkonten und Affiliates standen unter „Kunden" — ein
            // Affiliate ist aber keiner. Der Unterschied ist nicht kosmetisch:
            // Ein Firmenkonto kauft und bekommt eine Rechnung, ein Affiliate
            // vermittelt und bekommt eine Gutschrift. Beim einen fließt Geld
            // herein, beim anderen hinaus. Deshalb eine eigene Gruppe — aber
            // zwei Einträge darin, denn zusammenlegen ließen sie sich nicht:
            // Kampagnen und Codes auf der einen, Provision, Steuerstatus und
            // Auszahlung auf der anderen Seite haben nichts gemeinsam.
            { heading: 'Partner', items: [
              { to: '/cms/business', label: 'Firmenkonten', icon: Building2 },
              { to: '/cms/affiliate', label: 'Affiliates',  icon: Users },
              { to: '/cms/werbemittel', label: 'Werbemittel', icon: Megaphone },
            ]},
            { heading: 'Kommunikation', items: [
              { to: '/cms/email-templates', label: 'E-Mail Vorlagen', icon: Mail },
              { to: '/cms/faq',             label: 'FAQ & Support',   icon: HelpCircle },
              { to: '/cms/legal',           label: 'Rechtliches',     icon: FileText },
            ]},
            ...(user?.role === 'admin' ? [{ heading: 'Administration', items: [
              { to: '/cms/users', label: 'Benutzer',       icon: Users },
              { to: '/cms/bank',  label: 'Bankverbindung', icon: Landmark },
              { to: '/cms/rechnungsangaben', label: 'Rechnungsangaben', icon: FileText },
              { to: '/cms/email', label: 'E-Mail / SMTP',  icon: Mail },
              { to: '/cms/mfa',   label: 'MFA-Sicherheit', icon: ShieldCheck },
            ]}] : []),
          ].map(({ heading, items }, gi) => {
            // Zusammenklappbar, seit die Liste über die sichtbare Höhe
            // hinausgewachsen ist: Bei acht Gruppen und 33 Einträgen lagen
            // zuletzt gut zwei Drittel unterhalb des Fensterrands, und
            // „Benutzer" ganz unten war praktisch nicht mehr zu finden.
            //
            // Ohne Überschrift (das Dashboard) gibt es nichts zu klappen.
            const offen = !heading || !zu.includes(heading)
            const trefferHier = items.some(i => aktiv(i))
            return (
            <div key={gi}>
              {heading && (
                <button
                  onClick={() => umschalten(heading)}
                  className="w-full flex items-center gap-1.5 text-[8px] uppercase tracking-[0.25em] text-white/15 hover:text-white/35 px-3 mb-2.5 mt-7 font-light bg-transparent border-0 transition-colors"
                >
                  <ChevronRight
                    size={9} strokeWidth={2}
                    className={`transition-transform ${offen ? 'rotate-90' : ''}`}
                  />
                  <span className="flex-1 text-left">{heading}</span>
                  {/* Zugeklappt darf eine Gruppe nicht verschlucken, dass in
                      ihr etwas ungelesen liegt. */}
                  {!offen && items.some(i => i.badge > 0) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  )}
                  {!offen && trefferHier && <span className="w-1.5 h-1.5 rounded-full bg-white/30" />}
                </button>
              )}
              <div className={`space-y-0.5 ${offen ? '' : 'hidden'}`}>
                {items.map(({ to, label, icon: Icon, end, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-[7px] text-[12px] transition-all no-underline tracking-wide ${
                        isActive
                          ? 'bg-white/[0.08] text-white/90 font-normal'
                          : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03] font-light'
                      }`
                    }
                  >
                    <Icon size={13} strokeWidth={1.25} />
                    <span className="flex-1">{label}</span>
                    {badge > 0 && (
                      <span className="bg-white text-black text-[9px] min-w-[16px] h-4 px-1 flex items-center justify-center flex-shrink-0">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-6 py-6 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 bg-white/[0.08] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-light text-white/50">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-light text-white/60 truncate">{user?.name}</p>
              <p className="text-[9px] text-white/20 truncate font-light">{user?.role}</p>
            </div>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => navigate('/collection')}
              className="w-full flex items-center gap-2.5 px-0 py-1 text-[11px] text-white/20 hover:text-white/45 transition-colors bg-transparent border-0 text-left font-light tracking-wide"
            >
              <ExternalLink size={11} strokeWidth={1.25} />
              App ansehen
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-0 py-1 text-[11px] text-white/20 hover:text-white/45 transition-colors bg-transparent border-0 text-left font-light tracking-wide"
            >
              <LogOut size={11} strokeWidth={1.25} />
              Abmelden
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-[#fafaf9]">
        {/* Hinweis nur auf schmalen Schirmen: Die Seitenleiste belegt feste
            220 px, auf einem Telefon bleiben davon keine 160 px für den
            Inhalt. Statt hier alles umzubauen, führt der Weg zur schlanken
            Verwaltung — die deckt ab, was unterwegs anfällt. */}
        <NavLink to="/verwaltung"
          className="lg:hidden flex items-center gap-2 bg-black text-white px-4 py-3 text-[12px] font-light no-underline">
          <Smartphone size={15} strokeWidth={1.4} className="flex-shrink-0" />
          <span className="flex-1">Auf dem Telefon: zur schlanken Verwaltung</span>
          <ChevronRight size={15} strokeWidth={1.5} />
        </NavLink>
        {/* Ein Rahmen für alle Seiten.
            Vorher brachte jede ihren eigenen mit: zwölf nutzten px-10/lg:px-14,
            andere p-8, die Affiliate-Seite gar keinen — dafür eine Deckelung
            der Breite. Dadurch begann jede Seite an einer anderen Kante, und
            auf breiten Bildschirmen lief die eine randlos aus, während die
            andere rechts eine handbreite Lücke ließ.
            Die Deckelung sitzt jetzt hier und ist mittig, damit links und
            rechts gleich viel Luft bleibt. */}
        <div className="w-full max-w-[1500px] mx-auto px-6 sm:px-10 lg:px-14 py-8 lg:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
