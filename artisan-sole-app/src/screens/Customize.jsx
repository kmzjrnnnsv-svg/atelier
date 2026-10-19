import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { isNative } from '../App'
import { ArrowLeft, ArrowRight, Heart, ShoppingBag, Check, Star, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Send, Box, ZoomIn, ZoomOut, Share2, Plus } from 'lucide-react'

// Weitenbuchstaben in Alltagssprache. D, EE und EEE sind Werkstattmaße; in
// der Zusammenfassung soll stehen, was der Kunde gewählt hat, nicht wie es
// in der Manufaktur heißt.
const WEITEN_NAME = { D: 'Normal', EE: 'Breit', EEE: 'Sehr breit' }

// Dieselbe Frage wie im Größenfenster, in denselben Worten. Sie wird an zwei
// Stellen gestellt — sie darf nicht an beiden anders klingen.
//
// Gefragt wird nach der WEITE des Schuhs, gemessen wird der BALLENUMFANG des
// Fußes. Das ist kein Wortklauben: „Wie breit ist Ihr Fuß?" mit einer
// Millimeterzahl darunter ist eine Fangfrage — wer die Breite seines Fußes
// mit dem Lineal abmisst, bekommt rund ein Drittel des Wertes heraus, der
// dort steht, und wählt die falsche Weite.

/**
 * Woran man die eigene Weite merkt, ohne zu messen.
 *
 * „Normal oder breit?" beantwortet niemand zuverlässig aus dem Bauch — man
 * hat keinen Vergleich. Doch fast jeder hat Sneaker im Schrank, deren Passform
 * bekannt und dokumentiert ist, und zwar an den beiden Enden der Skala:
 *
 *   adidas Samba und Gazelle fallen ausgesprochen SCHMAL aus. Wer normale
 *   oder breite Füße hat, greift dort regelmäßig zur nächsten halben Größe,
 *   bei sehr breiten Füßen zur ganzen — nicht wegen der Länge, sondern um
 *   Platz am Ballen zu bekommen.
 *
 *   Der Nike Air Force 1 liegt am anderen Ende: großzügig geschnitten und
 *   deutlich geräumiger als beide.
 *
 * Damit lässt sich die Frage umdrehen. Statt den eigenen Fuß zu beurteilen,
 * beurteilt man Schuhe, die man kennt — und das kann jeder.
 *
 * Quellen: moresneakers.com (Samba fällt schmal aus, bei breiten Füßen halbe
 * Größe hoch, ab 2E ganze), kicksundercost.com (Gazelle schmal, halbe Größe
 * über Samba), freakyshoes.com (AF1 größer und geräumiger als Gazelle).
 * Stand August 2026.
 */
const SNEAKER_TEST = [
  { key: 'D',   frage: 'Samba oder Gazelle passen mir gut',          folge: 'Beide sind schmal geschnitten, wem sie passen, der hat keinen breiten Fuß.' },
  { key: 'EE',  frage: 'Samba drückt seitlich, Air Force 1 sitzt gut', folge: 'Genau der Unterschied zwischen schmal und großzügig. Du brauchst Platz am Ballen.' },
  { key: 'EEE', frage: 'Auch der Air Force 1 ist mir zu eng',          folge: 'Der gilt als einer der geräumigsten überhaupt. Dann ist es die weiteste Ausführung.' },
]

const WEITEN_WAHL = [
  { key: 'D',   titel: 'Normal',     kurz: 'Die meisten Füße', hinweis: 'Du kaufst Schuhe von der Stange und es passt meistens.' },
  { key: 'EE',  titel: 'Breit',      kurz: 'Drückt am Ballen', hinweis: 'Neue Schuhe drücken seitlich am Fußballen, obwohl die Länge stimmt. Oft kaufst du deshalb eine Nummer größer.' },
  { key: 'EEE', titel: 'Sehr breit', kurz: 'Auch weite drücken', hinweis: 'Auch als weit ausgewiesene Schuhe sind dir zu eng, oder du trägst üblicherweise Spezialweiten.' },
]

import useStore from '../store/store'
import { resolveMediaUrl } from '../lib/mediaUrl'
import { useJsonLd, produktDaten } from '../lib/jsonld'
import { useSeo, schuhBeschreibung } from '../lib/seo'
import { accessoryImages } from '../lib/accessoryImages'
import { LIEFERUMFANG } from '../lib/lieferumfang'
import { Preishinweis } from '../lib/preisangabe'
import { ownerPreisFuer } from '../lib/ownerLink'
import GroessenTabelle from '../components/GroessenTabelle'
import ExpressHinweis from '../components/ExpressHinweis'
import { sichtbareGruppen as gruppenFuer, festeWerte, abgeleiteteWerte, nurMitBild, farbenMitBild, musterFuer, farbWort, hatLederrand, FARBGRUPPEN_SOHLE, expressFreigabe } from '../lib/sohlenRegel'
import GuertelWahl from '../components/GuertelWahl'
import { guertelSatz } from '../lib/guertel'


// Relative Bild-URLs (/uploads/…) gegen die API-Base auflösen, base64/http
// und die Ledermuster aus dem Frontend (/leder/…) bleiben unverändert.
const resolveImg = resolveMediaUrl
import { apiFetch } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import ShoeName, { cleanShoeName } from '../lib/shoeName'
import CustomRequestModal from '../components/CustomRequestModal'
import ShoeModelViewer from '../components/ShoeModelViewer'
import Fortschritt from '../components/konfigurator/Fortschritt'
import { bildGrund } from '../lib/bildGrund'
import { useFensterHoehe } from '../lib/fensterHoehe'
import MassHilfe from '../components/MassHilfe'
import Schrittleiste from '../components/konfigurator/Schrittleiste'
import Wahlreihe from '../components/konfigurator/Wahlreihe'
import SchrittMenue from '../components/konfigurator/SchrittMenue'
import Zusammenfassung from '../components/konfigurator/Zusammenfassung'
import { newDraftId, saveDraft, flushDraft, findOpenDraft, discardDraft, markInCart } from '../lib/configDraft'

// ── Swipe: wische links/rechts um Option zu wechseln ────────────────────────
function useSwipe(items, selectedId, onSelect) {
  const touchRef = useRef({ x0: 0, y0: 0, swiping: false })
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0]
    touchRef.current = { x0: t.clientX, y0: t.clientY, swiping: false }
  }, [])
  const onTouchMove = useCallback((e) => {
    const t = e.touches[0]
    const dx = t.clientX - touchRef.current.x0
    const dy = t.clientY - touchRef.current.y0
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) touchRef.current.swiping = true
  }, [])
  const onTouchEnd = useCallback((e) => {
    if (!touchRef.current.swiping) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x0
    if (Math.abs(dx) < 40) return
    const avail = items.filter(i => i.available !== 0 && i.available !== false)
    if (avail.length < 2) return
    const cur = avail.findIndex(i => (i.key || String(i.id)) === selectedId)
    if (cur < 0) return
    const next = dx < 0 ? (cur + 1) % avail.length : (cur - 1 + avail.length) % avail.length
    onSelect(avail[next].key || String(avail[next].id))
  }, [items, selectedId, onSelect])
  return { onTouchStart, onTouchMove, onTouchEnd }
}

// ── Die Seite passt ins Fenster ─────────────────────────────────────────────
// Ab 1024 px Breite steht der Konfigurator da wie ein Bildschirm, nicht wie
// eine Seite: Bild links, Spalte rechts, gescrollt wird nichts. Die Höhe
// misst lib/fensterHoehe.js.
const PASST_AB = 1024

// ── Sterne (nur Anzeige) ────────────────────────────────────────────────────
function Stars({ value, size = 14 }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} strokeWidth={1} />
      ))}
    </span>
  )
}


// ═════════════════════════════════════════════════════════════════════════════
export default function Customize() {
  const navigate = useNavigate()
  const location = useLocation()
  const { favorites, toggleFavorite, latestScan, shoeMaterials, shoeColors, addToCart, cart, accessories: allAccessories, myCampaigns, affiliate, ownerLink, shoes, footMeasurements, saveFootMeasurements, matchFit, saveConfiguration } = useStore()
  const { user } = useAuth()

  // Schuh-Auflösung mit mehreren Fallbacks, damit product IMMER eine echte
  // id + category hat (sonst fehlen Whitelist und Optionsschritte):
  //  1) location.state.product (normale Navigation)
  //  2) ?id=-URL → Schuh aus dem Store
  //  3) erster echter Schuh aus dem Store (z. B. Direktaufruf /customize)
  //  4) Fake-Default nur, solange der Store noch leer ist
  const urlShoeId = new URLSearchParams(location.search).get('id')
  // Sprechende Adresse: /schuhe/heritage-oxford. Die alte Form /customize?id=13
  // bleibt gültig und wird unten auf die neue umgeschrieben, damit geteilte
  // Links und Lesezeichen weiter funktionieren.
  const { slug: urlSlug } = useParams()
  const product = location.state?.product
    || (urlSlug && shoes?.find(s => s.slug === urlSlug))
    || (urlShoeId && shoes?.find(s => String(s.id) === String(urlShoeId)))
    || (shoes && shoes.length > 0 ? shoes[0] : null)
    || {
      name: 'The Heritage Oxford', price: '€ 1.450', material: 'Full-Grain Calfskin',
      match: '99.4%', color: '#1f2937', image: null,
    }
  const category = product.category || 'OXFORD'

  // Was im Reiter steht und was Google zitiert. Bis hierher trug jede der
  // achtundvierzig Modellseiten denselben Titel: „ARTISAN SOLE".
  useSeo({
    titel: product?.name || null,
    beschreibung: schuhBeschreibung(product),
    // Ausdrücklich die sprechende Adresse, auch wenn der Besucher über
    // /customize?id=13 gekommen ist: Sonst zählte dieselbe Seite zweimal.
    pfad: product?.slug ? `/schuhe/${product.slug}` : undefined,
    // Wer ein Modell in einen Chat schickt, soll den Schuh sehen und nicht
    // den Schriftzug der Marke. Über resolveMediaUrl, weil die Aufnahmen aus
    // dem CMS als „/uploads/…" gespeichert sind — die Adresse muss die der
    // Programmierschnittstelle sein, nicht die der Seite.
    bild: product?.image ? resolveMediaUrl(product.image) : undefined,
    bildText: product?.name ? `${product.name}, rahmengenäht, nach Maß gefertigt` : undefined,
  })

  // Preis und Währung für das Suchergebnis. Ohne diesen Block steht die
  // Modellseite bei Google als graue Zeile neben Wettbewerbern, bei denen
  // „ab 1.290 €" danebensteht.
  useJsonLd(
    produktDaten(product, {
      url: product?.slug ? `${window.location.origin}/schuhe/${product.slug}` : undefined,
      bild: product?.image ? resolveMediaUrl(product.image) : undefined,
    }),
    'produkt',
  )

  // Unbekannter Slug: Die Auflösungskette oben fällt sonst auf den ersten
  // Schuh im Store zurück — der Besucher sähe unter /schuhe/gibt-es-nicht
  // also klaglos irgendein Modell, und die Adresse schriebe sich auch noch
  // darauf um. Erst prüfen, wenn die Liste wirklich geladen ist.
  const slugUnknown = !!urlSlug
    && !location.state?.product
    && Array.isArray(shoes) && shoes.length > 0
    && !shoes.some(s => s.slug === urlSlug)

  useEffect(() => {
    if (slugUnknown) navigate('/collection', { replace: true })
  }, [slugUnknown])

  // Alte Adresse auf die sprechende umschreiben. replace, damit der Zurück-
  // Knopf nicht zwischen beiden Formen hin und her springt. Der Zustand
  // (etwa eine geladene Konfiguration) wird dabei mitgenommen.
  useEffect(() => {
    if (urlSlug || slugUnknown || !product?.slug) return
    navigate(`/schuhe/${product.slug}`, { replace: true, state: location.state })
  }, [urlSlug, slugUnknown, product?.slug])

  // Frontend-Whitelist nach Kategorie, greift auch ohne Backend-Daten,
  // damit z. B. Oxford nie Patina/Velvet zeigt.
  const MATRIX_MATERIALS_BY_CAT = {
    OXFORD:           ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    WHOLECUT:         ['lux_calf', 'lux_suede', 'painted_full_grain', 'patina', 'box_calf', 'urban_suede', 'painted_calf'],
    LOAFER:           ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    // Der Mokassin läuft auf eigenen Ledern; keines der Dress-Leder gehört
    // dazu, und keines seiner drei gehört an einen Rahmengenähten.
    MOCCASIN:         ['calf_suede', 'nappa', 'fullgrain'],
    // Der Sport-Mokassin gibt es nur ungefüttert — beim Hersteller ist das
    // die einzige Wahl an diesem Modell.
    MOC_SPORT:        ['unlined_suede'],
    MOC_SPORT_BOOT:   ['lined_suede'],
    DERBY:            ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    DOUBLE_MONK:      ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    MONK:             ['lux_calf', 'lux_suede', 'painted_full_grain', 'box_calf', 'urban_suede', 'painted_calf'],
    CHELSEA:          ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BOOT:             ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BALMORAL:         ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    JODHPUR:          ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    CHUKKA:           ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    BELGIAN_SLIPPER:  ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    WELLINGTON:       ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    DRAKE:            ['lux_calf', 'box_calf', 'velvet', 'painted_full_grain', 'urban_suede', 'painted_calf'],
    SNEAKER:          ['lux_suede'],
    SNEAKER_LACED:    ['lux_suede'],
    SNEAKER_BOOT:     ['lux_suede'],
    LACELESS_TRAINER: ['lux_suede'],
  }
  // Per-Schuh konfigurierte Farben/Materialien (vom CMS gepflegt). Sind sie
  // gesetzt, ersetzen sie die globalen Listen, der Konfigurator zeigt nur
  // genau das, was der Admin für DIESEN Schuh freigegeben hat.
  const [perShoeMaterialKeys, setPerShoeMaterialKeys] = useState(null)   // null=loading, []=keine Beschränkung
  const [perShoeColorVariants, setPerShoeColorVariants] = useState(null) // null=loading
  // Standard-Bilderstrecke des Modells, greift solange die gewählte Farbe
  // keine eigenen Bilder hat.
  const [defaultImages, setDefaultImages] = useState([])
  const [slide, setSlide] = useState(0)   // Index in der aktiven Strecke
  // Pfad zum hinterlegten 3D-Modell, null wenn keines existiert.
  const [model3d, setModel3d] = useState(null)
  // Dynamische Konfigurator-Gruppen (Last, Welt, Heel, Toe, Schnalle, …)
  // Mit eigenem System verwaltet, Material/Color/Sole bleiben separat.
  const [extraOptionGroups, setExtraOptionGroups] = useState([])
  const [selectedExtras, setSelectedExtras] = useState({}) // { group_key: option_id }

  useEffect(() => {
    if (product?.id) {
      apiFetch(`/api/shoes/${product.id}/materials`)
        .then(keys => setPerShoeMaterialKeys(Array.isArray(keys) ? keys : []))
        .catch(() => setPerShoeMaterialKeys([]))
      apiFetch(`/api/shoes/${product.id}/colors`)
        .then(rows => setPerShoeColorVariants(Array.isArray(rows) ? rows : []))
        .catch(() => setPerShoeColorVariants([]))
      // Die Standard-Bilderstrecke liegt nicht in der Schuhliste (sie wäre
      // dort zu schwer), also einzeln nachladen. Sie greift, solange die
      // gewählte Farbe keine eigenen Bilder mitbringt.
      apiFetch(`/api/shoes/${product.id}`)
        .then(row => {
          let arr = []
          try { arr = JSON.parse(row?.default_images || '[]') } catch { arr = [] }
          if (!arr.length) arr = [row?.image_data, row?.hover_image_data].filter(Boolean)
          setDefaultImages(arr)
          setModel3d(row?.model_3d || null)
        })
        .catch(() => { setDefaultImages([]); setModel3d(null) })
    } else {
      setPerShoeMaterialKeys([])
      setPerShoeColorVariants([])
      setDefaultImages([])
      setModel3d(null)
    }

    // Material/Color haben eigene Spezial-UIs. `last` (Schuhform) entfällt als
    // manueller Schritt, die Leistenform wird über die Fußmaße automatisch
    // ermittelt (Auto-Match) und nur dezent im Checkout gezeigt.
    // In der Express-Linie bleibt nur offen, was am Modell freigegeben ist.
    // Alles andere legt das vorbereitete Bauteil fest — eine Gruppe zu zeigen,
    // die sich am fertigen Schaft nicht mehr ändern lässt, wäre ein
    // Versprechen, das die Werkstatt nicht halten kann.
    const expressOffen = expressFreigabe(product)

    const filterGroups = (groups) =>
      (Array.isArray(groups) ? groups : [])
        .filter(g => !['material', 'color', 'last'].includes(g.key))
        .filter(g => !expressOffen || expressOffen.has(g.key))
        // Nur zur Wahl, was man sehen kann — die Regel und ihre Ausnahmen
        // stehen in lib/sohlenRegel.js, wo sie geprüft werden.
        .map(g => nurMitBild(g, {
          behalten: g.key === 'loafer_decoration' ? product?.locked_decoration : null,
        }))

    // Optionen laden: zuerst per-Schuh, bei leer → Kategorie-Vorlage.
    const loadOptions = async () => {
      let raw = []
      if (product?.id) raw = await apiFetch(`/api/shoes/${product.id}/options`).catch(() => [])
      let list = filterGroups(raw)
      if (list.length === 0 && category) {
        raw = await apiFetch(`/api/category-templates/${category}/config`).catch(() => [])
        list = filterGroups(raw)
      }
      // 'last' (Schuhform) separat halten — wird fit-gesteuert eingeblendet.
      setLastGroup((Array.isArray(raw) ? raw : []).find(g => g.key === 'last') || null)
      setExtraOptionGroups(list)
      setSelectedExtras({})  // keine Auto-Defaults: User klickt jeden Schritt
    }
    loadOptions()
    // Die Express-Angaben hängen am Modell und ändern sich nur mit ihm — sie
    // stehen trotzdem in der Liste, damit niemand später rätselt, warum die
    // Auswahl nach einem Wechsel der Kollektion nicht nachzieht.
  }, [product?.id, product?.express, product?.express_groups, category])

  // Eigenstaendige Stil-Loafer: feste Ausfuehrung still vorbelegen (der
  // Selektor selbst wird unten ausgeblendet), damit sie in Warenkorb/
  // Bestellung mitgefuehrt wird.
  useEffect(() => {
    const lock = product?.locked_decoration
    if (!lock) return
    const grp = extraOptionGroups.find(g => g.key === 'loafer_decoration')
    const opt = grp?.values?.find(v => v.key === lock)
    if (opt && selectedExtras['loafer_decoration'] !== opt.id) {
      setSelectedExtras(prev => ({ ...prev, loafer_decoration: opt.id }))
    }
  }, [extraOptionGroups, product?.locked_decoration])

  // Label der fest gesetzten Ausfuehrung (fuer die Read-only-Anzeige).
  const lockedDecoLabel = product?.locked_decoration
    ? extraOptionGroups.find(g => g.key === 'loafer_decoration')?.values?.find(v => v.key === product.locked_decoration)?.label || null
    : null

  // Gewählte Sohlen-Art (Optionsgruppe 'sole') — ersetzt das Legacy-Sohlenfeld
  // in Warenkorb/Bestellung/Sticky-Bar.
  // Eine Kennung je Produktseite. Sie begleitet die Konfiguration bis in die
  // Bestellung, damit der Server dort nachschlagen kann, was gewählt wurde.
  const [draftId, setDraftId] = useState(() => newDraftId())
  // Liegengebliebene Konfiguration zu diesem Modell — erst fragen, dann handeln.
  const [openDraft, setOpenDraft] = useState(null)
  const [draftRestored, setDraftRestored] = useState(false)

  const soleArt = (() => {
    const g = extraOptionGroups.find(x => x.key === 'sole')
    return g ? (g.values.find(v => v.id === selectedExtras['sole']) || null) : null
  })()

  const gummiSohle = !hatLederrand(soleArt?.key)

  // Die Express-Freigabe hat beim Laden schon gefiltert; hier kommt dazu, was
  // die gewählte Sohle übriglässt — das ändert sich mit jeder Wahl.
  // Die gewählte Ausführung entscheidet mit: Ohne Metall auf dem Spann gibt
  // es keinen Metallton zu wählen.
  const dekoWahl = (() => {
    const g = extraOptionGroups.find(x => x.key === 'loafer_decoration')
    if (!g) return null
    return g.values.find(v => v.id === selectedExtras['loafer_decoration'])?.key
      || product?.locked_decoration || null
  })()
  const sichtbareGruppen = gruppenFuer(extraOptionGroups, { soleKey: soleArt?.key, dekoKey: dekoWahl })

  // ── Was im großen Feld steht ─────────────────────────────────────────────
  //
  // Bis hierher stand dort immer der Schuh. Bei „Laufsohle" nützt eine
  // Aufnahme von der Seite aber nichts: Wer zwischen glattem Leder und
  // Profilgummi wählt, will die Sohle sehen, und die ist auf jedem
  // Schuhfoto genau die Fläche, die auf dem Boden steht.
  //
  // Drei Quellen, in dieser Rangfolge:
  //
  //   1. Die Kachel, über der der Zeiger gerade steht. Sie ist die
  //      unmittelbarste Absicht — wer hinzeigt, will genau das sehen.
  //   2. Der gewählte Wert des Schritts, bei dem der Kunde gerade ist.
  //      Damit erscheint das Bild auch, wenn jemand eine Sohle auswählt,
  //      ohne den Schritt vorher angesteuert zu haben.
  //   3. Das Bild der Gruppe selbst, sobald ihr Schritt im Blick ist —
  //      die Übersicht über alles, was zur Wahl steht.
  //
  // Fällt alles weg, steht wieder der Schuh da. Das ist der Normalfall und
  // deshalb der letzte Zweig, nicht der erste.
  const [kachelImZeiger, setKachelImZeiger] = useState(null)
  const seiteRef = useRef(null)
  const seitenHoehe = useFensterHoehe(seiteRef, PASST_AB)
  // Seitenverhältnis des Fotos. Der Rahmen um das Bild nimmt genau diese
  // Form an, damit Pfeile und Zoom auf dem Foto liegen und nicht daneben in
  // der leeren Fläche der Spalte.
  const [bildSeite, setBildSeite] = useState(null)
  // Die Grundfarbe des Fotos (siehe lib/bildGrund.js). Auf großen
  // Bildschirmen nimmt die ganze linke Fläche sie an.
  const [bildFarbe, setBildFarbe] = useState(null)
  const bildGeladen = (e) => {
    const img = e.currentTarget
    const { naturalWidth: w, naturalHeight: h } = img
    if (w && h) setBildSeite(Math.round((w / h) * 1000) / 1000)
    setBildFarbe(bildGrund(img))
  }
  // Welcher Schritt gerade dran ist. Früher ermittelte ein Beobachter, welcher
  // Abschnitt beim Scrollen im Blick war; jetzt gibt es immer genau einen
  // Schritt, und er steht in `schrittKey` (siehe die Schrittliste weiter unten).
  const [gruppeImBlick, setGruppeImBlick] = useState(null)

  const gruppeJetzt = sichtbareGruppen.find(g => g.key === gruppeImBlick) || null
  const gewaehlterWert = gruppeJetzt?.values?.find(v => v.id === selectedExtras[gruppeJetzt.key]) || null
  // `schrittBild` steht weiter unten, bei `mat` und `col`: Leder und Farbe
  // sind eigene Schritte mit eigenen Bildern, und ihre Auswahl ist an dieser
  // Stelle noch nicht deklariert.

  // Summe der Extra-Aufpreise. Steht hinter `sichtbareGruppen`, weil eine
  // ausgeblendete Gruppe auch nichts kosten darf — der Sohlenrand an einer
  // Gummisohle wäre sonst ein Aufpreis für etwas, das es nicht gibt.
  const extrasPriceTotal = sichtbareGruppen.reduce((sum, g) => {
    const sel = g.values.find(v => v.id === selectedExtras[g.key])
    return sum + (sel?.price_extra || 0)
  }, 0)

  // Eine Farbe, die niemand mehr sieht, darf nicht mitbestellt werden. Wer
  // erst Sohlenrand „Cognac" wählt und dann auf Gummi wechselt, hätte sonst
  // eine Angabe in der Bestellung, zu der es am Schuh nichts gibt.
  useEffect(() => {
    if (!gummiSohle) return
    setSelectedExtras(prev => {
      const offen = FARBGRUPPEN_SOHLE.filter(k => prev[k] !== undefined)
      if (!offen.length) return prev
      const neu = { ...prev }
      for (const k of offen) delete neu[k]
      return neu
    })
  }, [gummiSohle])

  // Daten aus dem Store (mit Fallback)
  // Nur als verfügbar markierte Materialien (available !== 0) anzeigen,
  // Legacy-Einträge wie CALFSKIN/SUEDE/PATENT sind im Seed deaktiviert.
  const globalMatList = shoeMaterials.length
    ? shoeMaterials.filter(m => m.available !== 0)
    : [{ id: 1, key: 'calfskin', label: 'Kalbsleder', sub: 'Full-Grain', color: '#b45309', available: 1, tip: 'Robust und langlebig.', rating: 'good' }]
  // Welche Leder an diesem Modell überhaupt zur Wahl stehen.
  // Backend-Whitelist hat Vorrang; sonst greift die Kategorie-Whitelist.
  const catWhitelist = MATRIX_MATERIALS_BY_CAT[category]
  const baseMatList = perShoeMaterialKeys && perShoeMaterialKeys.length > 0
    ? globalMatList.filter(m => perShoeMaterialKeys.includes(m.key))
    : (catWhitelist
        ? globalMatList.filter(m => catWhitelist.includes(m.key))
        : globalMatList)

  // Per-Schuh Farb-Varianten haben Vorrang. Mehrere Varianten können denselben
  // Farbnamen haben (eine pro Material). Wir gruppieren nach (name, hex), und
  // wählen pro Farbe später dynamisch die Bilder anhand des selektierten
  // Materials (selMat).
  // Auswahl-States müssen vor den Listen deklariert werden, damit der
  // Material-basierte Farb-Filter sie referenzieren kann.
  const [selMat,  setSelMat]  = useState('')
  const [selCol,  setSelCol]  = useState('')
  const [added,   setAdded]   = useState(false)

  // Alle Leder des Modells, in einer Reihe.
  //
  // Hier stand einmal ein Vorfilter: Der Kunde musste sich zuerst zwischen
  // „Aesthetic" und „Durable" entscheiden und sah danach nur die eine
  // Hälfte. Die Namen sagten ihm nichts, die Entscheidung nahm ihm die
  // Übersicht — und wer Box Calf neben Lux Calf halten wollte, konnte es
  // nicht. Jetzt liegt alles nebeneinander; was ein Leder auszeichnet, steht
  // in seinem Empfehlungstext unter der Reihe.
  const matList = baseMatList

  // Globale Farben können per `applicable_materials` an einzelne Material-
  // Typen gebunden sein (z. B. Velvet-Farben nur bei Material 'velvet').
  // Wir filtern, sobald der Nutzer ein Material gewählt hat.
  // Solange noch kein Leder gewählt ist, zählt, was an DIESEM Modell
  // überhaupt zur Wahl steht. Vorher galt in diesem Fall „alles" — und die
  // Farbtafel eines Oxfords zeigte kurz die Velvet-Töne mit. Mit den
  // zweiundzwanzig Mokassin-Farben wäre daraus eine Tafel geworden, auf der
  // die Hälfte zu keinem der angebotenen Leder gehört.
  const modellLeder = new Set(baseMatList.map(m => m.key))
  const colorMatchesMaterial = (c, matKey) => {
    if (!c.applicable_materials || c.applicable_materials === '*') return true
    const erlaubt = c.applicable_materials.split(',').map(s => s.trim())
    if (!matKey) return erlaubt.some(k => modellLeder.has(k))
    return erlaubt.includes(matKey)
  }

  const filteredGlobalColors = farbenMitBild(shoeColors.filter(c => colorMatchesMaterial(c, selMat)))

  const colList = perShoeColorVariants && perShoeColorVariants.length > 0
    ? (() => {
        const groups = new Map()
        perShoeColorVariants.forEach(v => {
          const key = `${v.name}::${v.hex}`
          if (!groups.has(key)) groups.set(key, {
            id: v.id, key: `cms-${key}`, hex: v.hex, name: v.name,
            available: 1, rating: 'good',
            buckets: [],
          })
          groups.get(key).buckets.push({ material_key: v.material_key || null, images: v.images || [] })
        })
        return [...groups.values()]
      })()
    : (filteredGlobalColors.length ? filteredGlobalColors : [
        { id: 1, key: 'schwarz', hex: '#000000', name: 'Schwarz', available: 1, rating: 'good' },
      ])

  // Size selection: 'fit' (auto-match via Fußmaße), 'standard' (manueller
  // Notausgang), 'custom' (3D scan, Legacy)
  const [sizeType, setSizeType] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  // Custom-Anfrage-Modal (Pflicht: Telefon + WhatsApp Business)
  const [customRequestOpen, setCustomRequestOpen] = useState(false)
  const EU_SIZES = ['39', '39.5', '40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '46']

  // ── Passform (Auto-Match) ────────────────────────────────────────────────
  // Aus den gespeicherten Fußmaßen + fit_adjust ermittelt das System still die
  // best-passende Leisten×Weite×Größe. KEIN sichtbarer Auswahlschritt.
  const [fitMatches, setFitMatches] = useState([])      // alle passenden Leisten (gerankt)
  const [chosenLast, setChosenLast] = useState(null)    // vom Nutzer/Auto gewählter last_key
  const [lastGroup, setLastGroup]   = useState(null)    // 'last'-Optionsgruppe des Schuhs (Schuhform)
  const [fitState, setFitState] = useState('idle')      // 'idle'|'matching'|'matched'|'nomatch'|'error'
  /**
   * Die Weite, wenn sie nicht gemessen wurde.
   *
   * Der Ballenumfang ist das Maß, an dem die meisten aussteigen: Länge misst
   * man mit Wand und Zollstock, für den Umfang braucht es ein Maßband. Fehlt
   * er, wird die Weite nicht geraten, sondern gefragt — in denselben drei
   * Worten wie im Größenfenster, damit es überall dieselbe Frage bleibt.
   */
  const [gewaehlteWeite, setGewaehlteWeite] = useState('D')
  const hatUmfang = Number.isFinite(Number(footMeasurements?.ball_girth_mm))
    && Number(footMeasurements?.ball_girth_mm) > 0
  const [fitRetryKey, setFitRetryKey] = useState(0)     // manuelles Erneut-Versuchen
  // Global im CMS gepflegte Produktseiten-Texte (Familien, Lieferumfang, Badges).
  const [pageTexts, setPageTexts] = useState(null)
  useEffect(() => {
    apiFetch('/api/settings/product-texts').then(t => setPageTexts(t || null)).catch(() => {})
  }, [])
  // Lokale Maß-Eingabe (falls noch keine Maße gespeichert)
  const [measLen, setMeasLen] = useState('')
  const [measGirth, setMeasGirth] = useState('')
  const [measSaving, setMeasSaving] = useState(false)
  const [measOpen, setMeasOpen] = useState(false)   // Inline-Maßeingabe an der Passgenauigkeit
  const [measAnchor, setMeasAnchor] = useState('kopf')  // 'kopf' | 'passform' — wo sie erscheint
  const [groessenOffen, setGroessenOffen] = useState(false)
  // Was aus dem Größenfenster kommt, wenn jemand nicht messen will:
  // { last_key, last_label, width, size_system, size_label }. Ohne diesen
  // Zustand kannte die Bestellung nur die Zahl — Leisten und Weite fielen
  // heraus, und in der Fertigung stand dann die Standardweite, obwohl der
  // Kunde „breit" gewählt hatte.
  const [manuelleWahl, setManuelleWahl] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!footMeasurements?.foot_length_mm) {
      setFitMatches([]); setChosenLast(null); setFitState('idle')
      return
    }
    const adj = footMeasurements.fit_adjust || { length_mm: 0, girth_mm: 0 }
    const effLen = footMeasurements.foot_length_mm + (adj.length_mm || 0)
    // Ohne gemessenen Ballenumfang gibt es keinen zu korrigieren: Dann geht
    // statt eines Maßes die gewählte Weite an den Matcher.
    const effGirth = hatUmfang ? footMeasurements.ball_girth_mm + (adj.girth_mm || 0) : undefined
    setFitState('matching')

    const applyMatches = (matches) => {
      const top = matches[0]
      if (!top) { setFitMatches([]); setChosenLast(null); setFitState('nomatch'); return }
      setFitMatches(matches)
      setChosenLast(top.last_key)
      setSizeType('fit')
      setSelectedSize(top.size_label)
      setFitState('matched')
      // Ermittelte Passform still im Profil als saved_fit hinterlegen.
      saveFootMeasurements({
        foot_length_mm: footMeasurements.foot_length_mm,
        ball_girth_mm: footMeasurements.ball_girth_mm,
        fit_adjust: adj,
        saved_fit: {
          last_key: top.last_key, last_label: top.last_label,
          width: top.width, size_system: top.size_system, size_label: top.size_label,
          set_at: new Date().toISOString(),
        },
      }).catch(() => {})
    }

    // Transiente Fehler (z. B. Rate-Limit bei schnellem Neuladen) dürfen NICHT
    // als „keine Passform" erscheinen. Mehrfach versuchen; erst bei dauerhaftem
    // Fehler in den neutralen 'error'-Zustand wechseln (kein Custom-CTA).
    ;(async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        const { ok, matches } = await matchFit({
          category, length: effLen, girth: effGirth, width: gewaehlteWeite, tolerance: 5,
        })
        if (cancelled) return
        if (ok) { applyMatches(matches); return }
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)))
      }
      if (!cancelled) setFitState('error')
    })()

    return () => { cancelled = true }
  }, [footMeasurements?.foot_length_mm, footMeasurements?.ball_girth_mm, footMeasurements?.fit_adjust?.length_mm, footMeasurements?.fit_adjust?.girth_mm, category, fitRetryKey, hatUmfang, gewaehlteWeite])

  // Abgeleitet: beste Leiste je last_key, verfügbare (passende) Schuhformen,
  // und der aktuell gewählte Fit. selectedFit folgt der gewählten Schuhform.
  const bestPerLast = (() => { const m = new Map(); for (const x of fitMatches) if (!m.has(x.last_key)) m.set(x.last_key, x); return m })()
  const availableLasts = (() => {
    const vals = lastGroup?.values || []
    const fromShoe = vals
      .filter(v => bestPerLast.has(v.key))
      .map(v => ({ id: v.id, key: v.key, label: v.label, description: v.description, image: v.image, match: bestPerLast.get(v.key) }))
    const list = fromShoe.length
      ? fromShoe
      : [...bestPerLast.values()].map(mt => ({ id: 'last-' + mt.last_key, key: mt.last_key, label: mt.last_label, description: '', image: null, match: mt }))
    return list.sort((a, b) => (b.match.fitPercent || 0) - (a.match.fitPercent || 0))
  })()
  const selectedFit = chosenLast ? (bestPerLast.get(chosenLast) || null) : null
  // Die Form, auf der dieses Paar entsteht. Ermittelt, nicht gewählt — der
  // Passform-Block nennt sie, stellt sie aber nicht zur Auswahl.
  const gewaehlteLeiste = availableLasts.find(v => v.key === chosenLast) || null

  /**
   * Die Passform, die in Entwurf, Warenkorb und Bestellung geht.
   *
   * Zwei Wege führen hierher: die aus den Fußmaßen ermittelte (`selectedFit`)
   * und die von Hand im Größenfenster gewählte. Beide tragen dieselben Felder,
   * damit sich weiter unten niemand merken muss, welcher Weg genommen wurde.
   */
  const passform = sizeType === 'standard' ? manuelleWahl : selectedFit

  // Was die Weiten an der gewählten Leiste in Millimetern Ballenumfang
  // bedeuten. Kommt vom Matcher, aber nur solange der Umfang nicht gemessen
  // wurde — sonst steht die Weite fest und es gibt nichts zu wählen.
  const weitenHier = (!hatUmfang && selectedFit?.weiten) ? selectedFit.weiten : []

  /**
   * Welche Schuhformen im Größenfenster zur Wahl stehen.
   *
   * Nicht alle fünfzehn aus der Maßtabelle — nur die, die es für dieses
   * Modell gibt. Sind Maße hinterlegt, sind es die passenden; sonst die
   * Formen, die der Schuh überhaupt anbietet. Gibt der Schuh keine vor,
   * bleibt die Liste leer und das Fenster nennt eine als Richtwert, statt
   * eine Auswahl zu zeigen, die niemand treffen kann.
   */
  const groessenLeisten = (
    availableLasts.length
      ? availableLasts
      : (lastGroup?.values || [])
  ).map(v => ({ key: v.key, label: v.label }))

  /** Was aus dem Größenfenster zurückkommt, wird zur gewählten Passform. */
  const groesseUebernehmen = (wahl) => {
    setManuelleWahl(wahl)
    setSizeType('standard')
    setSelectedSize(wahl.size_label)
    setChosenLast(wahl.last_key)
  }

  // Falls die automatisch gewählte Leiste nicht unter den (Schuh-)verfügbaren ist,
  // auf die best-passende verfügbare umschalten.
  useEffect(() => {
    if (fitState !== 'matched') return
    if (availableLasts.length && !availableLasts.some(v => v.key === chosenLast)) {
      setChosenLast(availableLasts[0].key)
    }
  }, [fitState, availableLasts.map(v => v.key).join(','), chosenLast])

  // Maßeingabe öffnen, mit gespeicherten Werten vorbefüllen (zum Ändern).
  //
  // Das Formular erscheint dort, wo geklickt wurde. Es stand fest oben an der
  // Passgenauigkeit — wer ohne gespeicherte Maße weiter unten im Passform-Block
  // auf „Maße eingeben" drückte, sah deshalb gar nichts passieren, weil die
  // Eingabe außerhalb des Bildausschnitts aufging.
  const openMeasEdit = (anker = 'kopf') => {
    setMeasLen(footMeasurements?.foot_length_mm ? String(footMeasurements.foot_length_mm) : '')
    setMeasGirth(footMeasurements?.ball_girth_mm ? String(footMeasurements.ball_girth_mm) : '')
    setMeasAnchor(anker)
    setMeasOpen(true)
  }

  const saveMeasurements = async () => {
    const len = parseFloat(String(measLen).replace(',', '.'))
    const girth = parseFloat(String(measGirth).replace(',', '.'))
    // Die Länge genügt. Der Ballenumfang darf leer bleiben — dann wird die
    // Weite gewählt statt gemessen.
    if (!Number.isFinite(len)) return
    setMeasSaving(true)
    try {
      await saveFootMeasurements({
        foot_length_mm: len,
        ball_girth_mm: Number.isFinite(girth) ? girth : null,
      })
      setMeasLen(''); setMeasGirth(''); setMeasOpen(false)
    } catch { /* Die Maße bleiben im Formular stehen, der Kunde kann es erneut versuchen. */ } finally { setMeasSaving(false) }
  }

  // Ein Formular, zwei mögliche Plätze — gerendert wird es an dem, von dem
  // aus es geöffnet wurde.
  const massFormular = (
            <div className="mt-3 border border-black/10 p-3 max-w-md">
              <p className="t-klein c-leise mb-2">
                Die Fußlänge genügt uns für die Größe, ±0,5 cm sind völlig in Ordnung.
                Kommt der Ballenumfang dazu, bestimmen wir auch die Weite und den Leisten;
                ohne ihn fragen wir dich danach.
              </p>
              <div className="flex items-end gap-2">
                <label className="flex-1">
                  <span className="t-klein block c-leise mb-1">Fußlänge (mm)</span>
                  <input
                    type="number" inputMode="decimal" value={measLen}
                    onChange={(e) => setMeasLen(e.target.value)} placeholder="z. B. 270"
                    className="t-text w-full h-9 px-2.5 border border-black/15 outline-none focus:border-black/40"
                  />
                </label>
                <label className="flex-1">
                  <span className="t-klein block c-leise mb-1">
                    Ballenumfang (mm) <span className="text-black/25 normal-case tracking-normal">· optional</span>
                  </span>
                  <input
                    type="number" inputMode="decimal" value={measGirth}
                    onChange={(e) => setMeasGirth(e.target.value)} placeholder="wenn zur Hand"
                    className="t-text w-full h-9 px-2.5 border border-black/15 outline-none focus:border-black/40"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveMeasurements}
                  disabled={measSaving || !measLen}
                  className="t-klein h-11 px-5 g-akzent border-0 disabled:opacity-30"
                >
                  {measSaving ? '…' : 'Übernehmen'}
                </button>
              </div>
              {/* Die Anleitung steht unter den Feldern und nicht darüber:
                  Wer seine Maße kennt, tippt sie ein und ist fertig; wer sie
                  nicht kennt, sucht genau hier nach dem Grund, warum er
                  gerade nicht weiterkommt. Siehe MassHilfe. */}
              <MassHilfe className="mt-4 pt-3 border-t border-black/[0.08]" />

              {footMeasurements?.foot_length_mm && (
                <button type="button" onClick={() => setMeasOpen(false)} className="t-klein mt-3 c-leise hover:text-black/60 underline underline-offset-2 bg-transparent border-0 p-0">
                  Abbrechen
                </button>
              )}
            </div>
  )


  const [selectedAccessories, setSelectedAccessories] = useState([])
  const [duplicateDialog, setDuplicateDialog] = useState(false)

  const toggleAccessory = (id) => {
    setSelectedAccessories(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  // 3D Viewer
  const [is3D, setIs3D] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  // Reviews
  const [reviews, setReviews]       = useState([])
  const [showReview, setShowReview] = useState(false)
  const [myRating, setMyRating]     = useState(0)
  const [myComment, setMyComment]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Store-Daten aktualisieren (only reset if current value is invalid, not if empty)
  // Wenn nur ein Material verfügbar ist: automatisch wählen (Leder-Sektion entfällt).
  // Die Liste entsteht bei jedem Rendern neu; der Effekt soll aber nur
  // laufen, wenn sich die Leder wirklich ändern, nicht bei jedem Rendern.
  const matKeys = matList.map(m => m.key).join(',')
  useEffect(() => {
    if (matList.length === 1 && !selMat) {
      setSelMat(matList[0].key)
    } else if (matList.length > 1 && selMat && !matList.find(m => m.key === selMat)) {
      setSelMat('')
    }
  }, [matKeys])
  useEffect(() => {
    if (shoeColors.length && selCol && !shoeColors.find(c => c.key === selCol)) setSelCol('')
  }, [shoeColors])

  const mat      = matList.find(m => m.key === selMat) || matList[0]
  const col      = colList.find(c => c.key === selCol) || colList[0]

  // Die Farben hängen am Leder: „Schwarz" auf Box Calf ist eine andere Zeile
  // als „Schwarz" auf Lux Suede, mit eigenem Muster. Wechselt jemand das
  // Leder, bleibt er bei seiner Farbe, sofern es sie dort gibt. Sonst ist
  // die Farbe wieder offen, statt still auf die erste der Liste zu springen.
  const colKeys = colList.map(c => c.key).join(',')
  const [farbeNachholen, setFarbeNachholen] = useState(null)
  useEffect(() => {
    if (farbeNachholen) {
      const { hex, name } = farbeNachholen
      const treffer = colList.find(c => c.hex === hex && (!name || c.name === name))
        || colList.find(c => name && farbWort(c.name) === farbWort(name))
      if (treffer) { setSelCol(treffer.key); setFarbeNachholen(null) }
      return
    }
    if (!selCol || colList.some(c => c.key === selCol)) return
    const vorher = shoeColors.find(c => c.key === selCol)
    const gleich = vorher && colList.find(c => farbWort(c.name) === farbWort(vorher.name))
    setSelCol(gleich ? gleich.key : '')
  }, [colKeys, farbeNachholen])

  /**
   * Das Bild einer Farbe.
   *
   * Zwei Quellen, in dieser Reihenfolge: das eigene Bild der Farbe (im CMS
   * hinterlegt, gilt überall) und — bei den modelleigenen Farbvarianten — die
   * erste Aufnahme des Modells in dieser Farbe. Die zweite ist der ältere
   * Weg und bleibt: Wer für ein Modell zwanzig Farbstrecken gepflegt hat,
   * soll sie nicht ein zweites Mal hochladen müssen.
   */
  const farbBild = (c) => {
    if (!c) return null
    if (c.image) return resolveImg(c.image)
    const eimer = c.buckets?.find(b => b.material_key === selMat)
      || c.buckets?.find(b => b.material_key === null)
      || c.buckets?.[0]
    const erstes = eimer?.images?.[0] || c.images?.[0]
    return erstes ? resolveImg(erstes) : null
  }

  // Das Muster einer Farbe für die runde Wahl. Modelle mit eigenen
  // Farbstrecken haben als Bild ein Foto des ganzen Schuhs; im kleinen Kreis
  // ist das nicht zu lesen. Dann gilt das gleichnamige Ledermuster.
  const farbMuster = (c) => {
    const m = musterFuer(c, selMat, shoeColors)
    return m ? resolveImg(m) : farbBild(c)
  }

  // Was im großen Feld steht, während der Kunde konfiguriert. Die Reihenfolge
  // ist die der Absicht: die Kachel unter dem Zeiger, dann der gewählte Wert
  // des Schritts, bei dem er gerade ist, dann das Bild des Schritts selbst.
  // Leder und Farbe sind darin zwei Schritte wie jeder andere — sie tragen
  // die Kennungen `__leder` und `__farbe`, weil sie keine Optionsgruppen des
  // Servers sind, aber dieselbe Behandlung verdienen.
  //
  // Die Ledermuster (/leder/…) gehören nicht hierher. Sie sind 128 Pixel
  // große Ausschnitte; groß gezogen über die ganze Bühne standen sie dort
  // als unscharfe Fläche, wo der Schuh stehen sollte. Sie bleiben in der
  // runden Wahl, das große Feld zeigt weiter den Schuh.
  const grossBild = (u) => (u && !String(u).includes('/leder/') ? u : null)
  const schrittBild =
       grossBild(kachelImZeiger)
    || (gruppeImBlick === '__leder' && mat?.image ? grossBild(resolveImg(mat.image)) : null)
    || (gruppeImBlick === '__farbe' ? grossBild(farbBild(col)) : null)
    || (gewaehlterWert?.image ? grossBild(resolveImg(gewaehlterWert.image)) : null)
    || (gruppeJetzt?.preview_image ? grossBild(resolveImg(gruppeJetzt.preview_image)) : null)

  /* ── Der Gürtel ────────────────────────────────────────────────────────
   *
   * Er ist das einzige Zubehör, das nicht angehakt, sondern konfiguriert
   * wird — und das einzige, das etwas vom Schuh übernimmt. Deshalb steht er
   * nicht in der Kachelreihe „Passend dazu", sondern als eigener Schritt
   * zwischen den übrigen: Leder und Farbe stehen an dieser Stelle schon
   * fest, und genau das macht die Frage einfach.
   *
   * `guertelAn` kennt drei Zustände. `null` heißt: noch nicht gefragt —
   * beide Knöpfe stehen gleichwertig da. Ein ausdrückliches Nein ist etwas
   * anderes als eine unbeantwortete Frage, und der Schritt danach soll erst
   * aufgehen, wenn eine Antwort da ist.
   */
  const [guertelOptionen, setGuertelOptionen] = useState(null)
  const [guertelAn, setGuertelAn] = useState(null)
  const [guertelCfg, setGuertelCfg] = useState(null)

  useEffect(() => {
    apiFetch('/api/accessories/guertel')
      .then(setGuertelOptionen)
      .catch(() => setGuertelOptionen(null))   // nicht geführt → kein Schritt
  }, [])

  /**
   * Was der Schuh dem Gürtel vorgibt.
   *
   * Leder und Farbe immer — dafür ist der Gürtel da. Den Metallton nur, wenn
   * der Schuh einen hat: Am Double Monk ist er längst gewählt, und ihn ein
   * zweites Mal zu fragen hieße, zwei Antworten auf dieselbe Frage
   * zuzulassen. An einem Oxford gibt es keine Schnalle, und dann wird
   * gefragt.
   */
  const guertelVorgabe = useMemo(() => {
    // `col` kann aus den modelleigenen Farbvarianten stammen; deren Kennung
    // („cms-…") kennt der Server nicht. Dann zählt der Name, unter dem die
    // Farbe global geführt wird — sonst schlüge die Prüfung beim Bestellen
    // fehl, und zwar erst an der Kasse.
    const global = shoeColors.find(c => c.key === selCol)
      || shoeColors.find(c => c.name && col?.name && c.name.toLowerCase() === col.name.toLowerCase())
    const metallGruppe = extraOptionGroups.find(g => g.key === 'buckle_color')
    const metallWert = metallGruppe?.values?.find(v => v.id === selectedExtras['buckle_color'])
    return {
      leder: mat?.key || null,      leder_label: mat?.label || null,
      farbe: global?.key || null,   farbe_name: global?.name || col?.name || null,
      farbe_hex: global?.hex || col?.hex || null,
      metall: metallWert?.key || null, metall_label: metallWert?.label || null,
      metall_hex: metallWert?.color_hex || null,
    }
  }, [mat, selCol, col, shoeColors, extraOptionGroups, selectedExtras])

  // Ohne Leder oder Farbe lässt sich kein Gürtel dazu bauen — der Schritt
  // erscheint erst, wenn beides GEWÄHLT ist.
  //
  // `selMat` und `selCol` stehen hier ausdrücklich mit dabei: `mat` und `col`
  // fallen auf den ersten Eintrag der Liste zurück, damit die Seite von
  // Anfang an etwas zeigen kann. Ohne diese Prüfung böte der Gürtel eine
  // Farbe an, die der Kunde nie angeklickt hat — sie stünde nur zufällig
  // vorne in der Liste.
  const guertelMoeglich = !!(guertelOptionen && selMat && selCol
    && guertelVorgabe.leder && guertelVorgabe.farbe)

  /** Die Position, die in Warenkorb und Bestellung geht. Preis: der zum Paar. */
  const guertelZeile = useMemo(() => {
    if (!guertelAn || !guertelCfg || !guertelOptionen) return null
    const preis = Number(guertelOptionen.preis_zum_paar) || 0
    return {
      key: guertelOptionen.artikel.key,
      name: guertelOptionen.artikel.name,
      priceNum: preis,
      price: `€ ${preis.toLocaleString('de-DE', { minimumFractionDigits: 0 })}`,
      config_kind: 'belt',
      belt: guertelCfg,
      beschreibung: guertelSatz(guertelCfg, guertelOptionen.spielraum_cm),
    }
  }, [guertelAn, guertelCfg, guertelOptionen])

  // ── Der Gürtel kostet ab dem Ja, nicht erst ab der letzten Angabe ───────
  //
  // Bisher hing der Preis an `guertelZeile`, und die entsteht erst, wenn Form,
  // Metall und Größe stehen. Wer auf „Ja, ich möchte einen Gürtel dazu"
  // drückte, sah deshalb: nichts. Derselbe Betrag wie vorher, und erst drei
  // Angaben später sprang die Summe. Das liest sich wie ein Fehler und im
  // ungünstigen Fall wie ein versteckter Aufpreis.
  //
  // Der Preis steht von Anfang an fest, er hängt an keiner der drei Angaben.
  // Also wird er auch von Anfang an gezeigt.
  const guertelPreis = guertelAn && guertelOptionen
    ? Number(guertelOptionen.preis_zum_paar) || 0
    : 0

  // Was am Gürtel noch fehlt. Der Preis zählt schon, in den Warenkorb geht er
  // erst fertig: Eine halbe Konfiguration ist keine Bestellposition, und die
  // Werkstatt kann mit „Gürtel, Größe offen" nichts anfangen.
  const guertelUnfertig = guertelAn === true && !guertelCfg

  // Zubehör wird nach gewählter Lederart empfohlen (nicht mehr pro Schuhmodell):
  // material_keys '*'/leer = universell; sonst muss das gewählte Material (selMat)
  // enthalten sein. Zusätzlich optionale Farb-Zuordnung (z. B. schwarzer Spanner
  // nur bei schwarzen Schuhen).
  const matMatchesAccessory = (a) => {
    const mk = (a.material_keys || '').trim()
    if (!mk || mk === '*') return true
    if (!selMat) return false
    return mk.split(',').map(s => s.trim()).includes(selMat)
  }
  const colorMatchesAccessory = (a) => {
    const cm = (a.color_match || '').trim()
    if (!cm) return true
    const name = (col?.name || '').toLowerCase()
    if (!name) return false
    return cm.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).some(kw => name.includes(kw))
  }
  // Nicht jedes Zubehör passt zu jedem Modell. Der Stiefelspanner etwa gehört
  // zu Stiefeln und sonst nirgendwohin — er stand bislang bei jedem Halbschuh
  // mit dabei, weil die Kategorie-Felder aus der Datenbank hier ungenutzt
  // blieben. `not_recommended_for` schließt aus, `recommended_for` schränkt
  // ein; leer heißt „passt überall".
  const kategorien = [product.category, product.type, product.build]
    .map(v => String(v || '').trim().toUpperCase()).filter(Boolean)
  /**
   * Kategorienliste aus einem Feld lesen, das mal JSON und mal Komma-Liste ist.
   *
   * Beides kommt vor: Das CMS schreibt ["SNEAKER"], ältere Einträge tragen
   * "SNEAKER, BOOT". Zuerst JSON versuchen, sonst am Komma trennen — vorher
   * lief beides durch dieselbe Trennung, und "[]" wurde dabei zur Kategorie
   * namens „[]". Ein Zubehör mit leerem recommended_for galt damit als „nur
   * für [] empfohlen" und verschwand bei jedem Schuh.
   */
  const liste = (v) => {
    const roh = String(v ?? '').trim()
    if (!roh) return []
    if (roh.startsWith('[')) {
      try {
        const j = JSON.parse(roh)
        return Array.isArray(j) ? j.map(x => String(x).trim().toUpperCase()).filter(Boolean) : []
      } catch { return [] }
    }
    return roh.split(',').map(x => x.trim().toUpperCase()).filter(Boolean)
  }
  const kategorieMatchesAccessory = (a) => {
    if (liste(a.not_recommended_for).some(k => kategorien.includes(k))) return false
    const nur = liste(a.recommended_for)
    if (!nur.length) return true
    return nur.some(k => kategorien.includes(k))
  }

  const accessories = (Array.isArray(allAccessories) ? allAccessories : [])
    // `config_kind` heißt: Dieser Artikel wird konfiguriert, nicht angehakt,
    // und hat deshalb weiter oben einen eigenen Schritt. Der Gürtel stand
    // trotzdem noch einmal in der Kachelreihe „Passend dazu" — zweimal
    // dasselbe Zubehör auf einer Seite, einmal mit Leder, Farbe, Schnalle
    // und Länge, einmal als Häkchen ohne all das. Wer das Häkchen setzte,
    // hätte einen Gürtel ohne Konfiguration bestellt.
    //
    // Die Regel steht bewusst am Feld und nicht am Namen: Kommt ein zweiter
    // konfigurierbarer Artikel dazu, ist er von selbst mit erfasst.
    .filter(a => !a.config_kind)
    .filter(a => a.is_active !== 0 && matMatchesAccessory(a) && colorMatchesAccessory(a) && kategorieMatchesAccessory(a))
    .map(a => ({
      id: a.id,
      name: a.name,
      price: parseFloat(a.price) || 0,
      // Dieselbe Bilderstrecke wie auf der Zubehör-Seite. Vorher wurde nur
      // `image_data` gelesen — Artikel mit Strecke standen deshalb ohne Bild da.
      image: accessoryImages(a)[0] || null,
      color: a.color || '#888',
    }))

  // Auswahl bereinigen, wenn nach Material-/Farbwechsel ein gewähltes Zubehör
  // nicht mehr angezeigt wird.
  useEffect(() => {
    const visible = new Set(accessories.map(a => a.id))
    setSelectedAccessories(prev => {
      const next = prev.filter(id => visible.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [selMat, selCol])

  // Aktive Bild-Galerie für die Farbe, abhängig vom gewählten Material:
  // 1) Material-spezifischer Bucket (material_key === mat.key)
  // 2) Fallback: Default-Bucket (material_key === null)
  // 3) Fallback: legacy `col.images` (wenn keine Buckets vorhanden)
  const currentImages = (() => {
    if (!col) return []
    if (col.buckets) {
      const matBucket = col.buckets.find(b => b.material_key === mat?.key)
      if (matBucket?.images?.length) return matBucket.images
      const defBucket = col.buckets.find(b => b.material_key === null)
      if (defBucket?.images?.length) return defBucket.images
      return col.buckets[0]?.images || []
    }
    return col.images || []
  })()

  // Die tatsächlich gezeigte Strecke: hat die gewählte Farbe eigene Bilder,
  // zählen ausschließlich diese — sonst sähe man Aufnahmen in einer Farbe,
  // die gerade gar nicht ausgewählt ist. Erst wenn sie keine mitbringt,
  // greift die Standard-Strecke des Modells.
  const gallery = currentImages.length
    ? currentImages
    : (defaultImages.length ? defaultImages : [product.image].filter(Boolean))

  // Beim Wechsel von Farbe oder Material vorne beginnen, sonst zeigte die
  // neue Strecke unvermittelt ihr drittes Bild.
  useEffect(() => { setSlide(0) }, [selCol, selMat])

  const slideCount = gallery.length
  const activeSlide = Math.min(slide, Math.max(0, slideCount - 1))
  const goSlide = (dir) => {
    if (slideCount < 2) return
    setSlide(prev => (prev + dir + slideCount) % slideCount)
    setZoomed(false)
    setIs3D(false)
  }

  const color    = col?.hex || product.color
  const isFav    = favorites.includes(String(product.id))
  const avg      = reviews.length ? reviews.reduce((s,r) => s + r.rating, 0) / reviews.length : 0
  const myRev    = reviews.find(r => r.user_id === user?.id)

  // ── Der Bestelllink des Inhabers schlägt alles ────────────────────────
  //
  // Er zieht nichts ab, er SETZT den Preis. Deshalb steht er hier, VOR jeder
  // Nachlassrechnung: Wo er gilt, gibt es keinen Katalogpreis mehr, von dem
  // sich ein Prozentsatz rechnen ließe, und zwei Vergünstigungen übereinander
  // gäbe es ohnehin nicht.
  //
  // Die Aufpreise für Optionen, Gürtel und Zubehör kommen unverändert obendrauf.
  // Der Festpreis gilt dem Modell, nicht der ganzen Bestellung.
  const ownerPreis = ownerPreisFuer(ownerLink?.preise, product.id)

  // Preis: Basispreis aus DB + Options-Aufpreise (inkl. Sohlen-Art) + Zubehör
  //
  // Zwei Wege zu einem Nachlass, und beide sollen ohne Code-Eingabe wirken:
  //   • Promotion-Konto — ein Prozentsatz am Benutzer.
  //   • Firmen-Aktion — der Kunde ist Teilnehmer, weil seine Adresse zur
  //     hinterlegten Domain gehört. Der Prozentsatz steht an der Kampagne.
  // Gilt eine Aktion für ausgewählte Modelle, zählt sie nur dort. Treffen
  // mehrere zu, gewinnt die günstigste — alles andere wäre schwer zu erklären.
  const campaignForShoe = (Array.isArray(myCampaigns) ? myCampaigns : [])
    .filter(c => c.status === 'open' && Number(c.discount_pct) > 0)
    .filter(c => !Array.isArray(c.allowed_shoe_ids) || !c.allowed_shoe_ids.length
      || c.allowed_shoe_ids.includes(Number(product.id)))
    .sort((a, b) => Number(b.discount_pct) - Number(a.discount_pct))[0] || null

  const userPct = user?.is_promotion ? (user?.promotion_discount_pct || 0) : 0
  const campaignPct = campaignForShoe ? Number(campaignForShoe.discount_pct) : 0
  // Dritter Weg: der Werbelink eines Affiliates (?ref=). Was dem Geworbenen
  // zugesagt wurde, steht am Affiliate und gilt für jedes Modell.
  //
  // Anders als die beiden Aktionen des Hauses hat dieser Nachlass eine
  // Euro-Grenze: Der Affiliate zahlt ihn aus seiner Provision, und die ist je
  // Paar gedeckelt. Ohne die Grenze wären 10 % auf ein Paar zu 1.450 € eine
  // Zusage über 145 € aus einem Topf von 40.
  const affiliatePct = ownerPreis != null ? 0 : (Number(affiliate?.customer_discount_pct) || 0)
  const affiliateCap = Number(affiliate?.discount_cap) || 0
  // Über den Bestelllink des Inhabers gibt es keine Nachlässe obendrauf. Der
  // Festpreis IST der Nachlass; ein Vermittlerrabatt darauf ginge zulasten
  // einer Provision, die es hier gar nicht gibt.
  const hausPct = ownerPreis != null ? 0 : Math.max(userPct, campaignPct)
  const promoDiscountPct = ownerPreis != null ? 0 : Math.max(hausPct, affiliatePct)
  const isPromo = promoDiscountPct > 0 || !!user?.is_promotion

  const effectivePrice = user?.is_promotion && product.promotion_price ? product.promotion_price : product.price
  const katalogPreis = parseFloat(String(effectivePrice).replace(/[^0-9.,]/g, '').replace('.', '').replace(',', '.')) || 0
  const basePrice = ownerPreis != null ? ownerPreis : katalogPreis
  // Zwei Summen, weil zwei Dinge gemeint sind: `zubehoerTotal` ist, was
  // angehakt wurde, `accessoryTotal` zählt den Gürtel dazu. Der Gürtel ist
  // kein angehaktes Zubehör, sondern ein eigener Schritt — stand er in
  // derselben Summe, las die Zeile unter dem Preis „(inkl. 0× Zubehör)":
  // Der Betrag war da, das Stück gab es nicht.
  const zubehoerTotal = selectedAccessories.reduce((sum, id) => {
    const acc = accessories.find(a => a.id === id)
    return sum + (acc?.price || 0)
  }, 0)
  const accessoryTotal = zubehoerTotal + guertelPreis

  // Der Nachlass gilt auf alles, was konfiguriert wurde — Schuh, Optionen und
  // Zubehör. Vorher hing er allein am Zubehör, der Schuhpreis blieb stehen.
  const priceBeforeDiscount = basePrice + extrasPriceTotal + accessoryTotal
  const hausNachlass = hausPct > 0 ? Math.round(priceBeforeDiscount * hausPct / 100) : 0
  const affNachlassRoh = affiliatePct > 0 ? Math.round(priceBeforeDiscount * affiliatePct / 100) : 0
  const affNachlass = affiliateCap > 0 ? Math.min(affNachlassRoh, affiliateCap) : affNachlassRoh
  // Es gilt der günstigste Weg für den Kunden, nicht die Summe: Zwei Nachlässe
  // aufeinander wären zweimal derselbe Rabatt.
  const totalDiscount = Math.max(hausNachlass, affNachlass)
  // Der wirksame Satz kann unter dem zugesagten liegen, wenn die Euro-Grenze
  // greift. Angezeigt wird, was tatsächlich abgezogen wird.
  const wirksamerPct = priceBeforeDiscount > 0 ? (totalDiscount / priceBeforeDiscount) * 100 : 0
  const accDiscount = Math.round(zubehoerTotal * wirksamerPct / 100)
  const totalPrice = priceBeforeDiscount - totalDiscount
  const formatPrice = (v) => `€ ${v.toLocaleString('de-DE', { minimumFractionDigits: 0 })}`
  // Eine Nachkommastelle genügt; „9,7 %" ist ehrlicher als „10 %", wenn die
  // Euro-Grenze ein Stück abgeschnitten hat.
  const satzText = (v) => String(Math.round(v * 10) / 10).replace('.', ',')
  const displayPrice = formatPrice(totalPrice)
  // Was über dem Grundpreis liegt, in Worten. Eine Liste für alle drei
  // Stellen, an denen der Preis steht (Kopf, Zusammenfassung, Leiste unten) —
  // stünde sie dreimal, wiche sie nach dem nächsten Umbau an einer ab.
  const preisAufschlaege = [
    extrasPriceTotal > 0 && `+€${extrasPriceTotal} Optionen`,
    guertelPreis > 0 && `+€${guertelPreis} Gürtel`,
    zubehoerTotal > 0 && `+€${zubehoerTotal} Zubehör`,
  ].filter(Boolean)

  // Swipe
  // Wischen über das Bild blättert durch die Ansichten des Schuhs.
  const bildSwipe = useSwipe(
    gallery.map((_, i) => ({ key: String(i) })),
    String(activeSlide),
    (k) => { setSlide(Number(k)); setZoomed(false) },
  )

  // ── Konfiguration speichern / geladene Konfiguration anwenden ───────────────
  const [savedToast, setSavedToast]   = useState('')   // '', 'saved', 'login'
  const [savingConfig, setSavingConfig] = useState(false)
  const appliedConfigRef = useRef(false)

  // Eine via Profil geladene Konfiguration einmalig auf die Auswahl anwenden,
  // sobald die Material-/Farb-Listen dieses Schuhs bereitstehen.
  useEffect(() => {
    const cfg = location.state?.loadConfig
    if (!cfg || appliedConfigRef.current) return
    if (String(cfg.shoeId) !== String(product.id)) return
    if (!matList.length) return
    appliedConfigRef.current = true
    if (cfg.material) setSelMat(cfg.material)
    if (cfg.color) setSelCol(cfg.color)
    if (Array.isArray(cfg.accessories)) setSelectedAccessories(cfg.accessories)
    if (cfg.extras && typeof cfg.extras === 'object') setSelectedExtras(cfg.extras)
  }, [location.state, product.id, matList.length])

  const handleSaveConfiguration = async () => {
    if (!user) {
      setSavedToast('login'); setTimeout(() => setSavedToast(''), 3500)
      return
    }
    setSavingConfig(true)
    try {
      await saveConfiguration({
        shoeId: product.id,
        shoeName: cleanShoeName(product.name),
        category,
        label: [cleanShoeName(product.name), mat?.label, col?.name].filter(Boolean).join(' · '),
        material: selMat, materialName: mat?.label || '',
        color: selCol, colorName: col?.name || '', colorHex: col?.hex || product.color || null,
        accessories: selectedAccessories,
        extras: selectedExtras,
        price: displayPrice,
      })
      setSavedToast('saved'); setTimeout(() => setSavedToast(''), 2500)
    } catch {
      setSavedToast('');
    } finally { setSavingConfig(false) }
  }

  // Reviews laden
  useEffect(() => {
    if (!product.id) return
    apiFetch(`/api/reviews/shoe/${product.id}`).then(setReviews).catch(() => {})
  }, [product.id])

  const addAccessoriesToCart = () => {
    selectedAccessories.forEach(id => {
      const acc = accessories.find(a => a.id === id)
      if (acc) {
        addToCart({
          shoeId: `acc-${acc.id}`,
          name: acc.name,
          material: '',
          color: acc.color,
          price: formatPrice(acc.price),
          sole: '',
          image: null,
          isAccessory: true,
          accKey: acc.key,
          shipsAlone: Number(acc.ships_alone) === 1,
        })
      }
    })
    // Der Gürtel trägt seine Konfiguration mit in den Korb. Ohne sie stünde
    // dort ein Artikel namens „Gürtel Hamptons" und niemand wüsste, welcher.
    if (guertelZeile) {
      addToCart({
        shoeId: `guertel-${guertelZeile.belt.leder}-${guertelZeile.belt.farbe}-${guertelZeile.belt.form}-${guertelZeile.belt.metall}-${guertelZeile.belt.groesse}`,
        name: guertelZeile.name,
        material: guertelZeile.beschreibung,
        color: guertelZeile.belt.farbe_hex,
        price: guertelZeile.price,
        sole: '',
        image: null,
        isAccessory: true,
        accKey: guertelZeile.key,
        configKind: 'belt',
        belt: guertelZeile.belt,
        shipsAlone: true,
      })
    }
  }

  const chosenEU = sizeType === 'fit'
    ? selectedFit?.size_label
    : sizeType === 'custom'
      ? latestScan?.eu_size
      : selectedSize
  // Zum Login wechseln und die aktuelle Konfiguration mitgeben, damit sie
  // nach erfolgreicher Anmeldung auf der Produktseite wiederhergestellt wird.
  const goToLogin = () => {
    navigate('/login', {
      state: {
        from: location.pathname + location.search,
        loadConfig: {
          shoeId: product.id,
          material: selMat,
          color: selCol,
          accessories: selectedAccessories,
          extras: selectedExtras,
        },
      },
    })
  }

  // Maße, die fürs Auto-Matching verwendet wurden (für Bestellung/Manufaktur)
  const footMeasurementsUsed = footMeasurements?.foot_length_mm
    ? {
        foot_length_mm: footMeasurements.foot_length_mm,
        ball_girth_mm: footMeasurements.ball_girth_mm ?? null,
        // Wurde die Weite gemessen oder geschätzt? Der Unterschied gehört in
        // die Bestellung, nicht nur in den Bildschirm: Die Fertigung beginnt
        // erst Wochen später, und bis dahin lässt sich nachfragen. Ohne diese
        // Notiz sähe eine geschätzte Weite in der Auftragsliste aus wie eine
        // gemessene — und niemand käme auf die Idee zu fragen.
        ...(hatUmfang ? {} : { weite_geschaetzt: true, weite: gewaehlteWeite }),
      }
    : null
  // Steht eine Größe fest? (Auto-Match, manueller Notausgang oder Legacy-Scan)
  const groesseSteht = (sizeType === 'fit' && !!selectedFit)
    || (sizeType === 'standard' && !!selectedSize)
    || sizeType === 'custom'
  // In den Warenkorb geht nur, was fertig ist. Das ist die Größe UND, falls
  // ein Gürtel gewählt wurde, dessen Angaben: Wer „Ja" gedrückt und dann
  // weitergescrollt hat, hätte sonst einen Gürtel im Warenkorb, den niemand
  // fertigen kann. Der Preis steht in diesem Zustand bereits, das ist der
  // Unterschied zwischen „kostet schon" und „ist schon bestellbar".
  const fitReady = groesseSteht && !guertelUnfertig
  // Maße vorhanden, aber kein Treffer & kein manueller Override → Custom-Anfrage
  const needsCustomRequest = (fitState === 'nomatch' && sizeType !== 'standard') || sizeType === 'custom'

  // ── Die Schritte ─────────────────────────────────────────────────────────
  //
  // Eine Liste, aus dem errechnet, was dieses Modell anbietet: Leder (nur bei
  // mehr als einem), Farbe, je eine Optionsgruppe, der Gürtel, falls es ihn
  // gibt, die Passform, die Übersicht. Wählt jemand eine Gummisohle, fallen
  // die Schritte der Sohlenfarben aus der Liste, wie sie vorher aus der
  // Seite fielen.
  //
  // Gemerkt wird der Schlüssel des Schritts, nicht seine Nummer: Fällt ein
  // Schritt davor weg, bleibt der Kunde, wo er ist, statt einen Schritt
  // weiterzurutschen.
  const angeboteneGruppen = sichtbareGruppen
    .filter(g => !(product?.locked_decoration && g.key === 'loafer_decoration'))
  const groesseText = sizeType === 'fit' && selectedFit?.size_label ? `EU ${String(selectedFit.size_label).replace('.', ',')}`
    : sizeType === 'standard' && selectedSize ? `EU ${String(selectedSize).replace('.', ',')}`
    : sizeType === 'custom' ? 'Custom Made' : null
  const schritte = [
    matList.length > 1 && { key: '__leder', titel: 'Leder', fertig: !!selMat, wahl: selMat ? mat?.label : null },
    { key: '__farbe', titel: 'Farbe', fertig: !!selCol, wahl: selCol ? col?.name : null },
    ...angeboteneGruppen.map(g => {
      const v = g.values.find(x => x.id === selectedExtras[g.key])
      return { key: g.key, titel: g.label, gruppe: g, fertig: !!v, wahl: v?.label || null }
    }),
    guertelMoeglich && {
      key: '__guertel', titel: 'Gürtel',
      fertig: guertelAn === false || (guertelAn === true && !guertelUnfertig),
      wahl: guertelAn === true ? 'Mit Gürtel' : guertelAn === false ? 'Ohne Gürtel' : null,
    },
    { key: '__passform', titel: 'Passform', fertig: groesseSteht || needsCustomRequest, wahl: groesseText },
    { key: '__uebersicht', titel: 'Übersicht', fertig: false, wahl: null },
  ].filter(Boolean)
  const [schrittKey, setSchrittKey] = useState(null)
  const [menueOffen, setMenueOffen] = useState(false)
  const schrittNr = Math.max(0, schritte.findIndex(x => x.key === schrittKey))
  const schritt = schritte[schrittNr]
  // Ab 1024 px Breite: Bild links, Spalte rechts, die Seite füllt genau das
  // Fenster (siehe useFensterHoehe).
  const passt = seitenHoehe != null
  // Erreichbar ist ein Schritt, vor dem alles gewählt ist.
  const erreichbar = (i) => schritte.slice(0, i).every(x => x.fertig)
  const weiterFrei = schritt.fertig && schrittNr < schritte.length - 1
  const geheZu = (key) => {
    setSchrittKey(key)
    setKachelImZeiger(null)
    // Der neue Schritt soll im Blick sein, auf dem Telefon steht die Wahl
    // unter dem Bild.
    if (window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        document.getElementById('konfig-wahl')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      })
    }
  }
  const weiter = () => { if (weiterFrei) geheZu(schritte[schrittNr + 1].key) }
  const zurueck = () => { if (schrittNr > 0) geheZu(schritte[schrittNr - 1].key) }
  // Das große Bild folgt dem Schritt: Leder und Farbe zeigen ihr Muster,
  // eine Gruppe den gewählten Wert.
  useEffect(() => { setGruppeImBlick(schritt.key) }, [schritt.key])
  // Extras als lesbare Liste mit Aufpreissumme, wird in der Bestellung
  // mitgeführt, damit Admin & Manufaktur die Spezifikation sehen.
  //
  // `festeWerte` trägt nach, was nicht gewählt, sondern gesetzt ist: der
  // Rahmen (Welt) ist immer City. Er erscheint nicht als Schritt, muss aber
  // in der Spezifikation stehen — die Werkstatt liest sie, nicht den
  // Bildschirm.
  const extrasForCart = [
    ...sichtbareGruppen
      .map(g => {
        const sel = g.values.find(v => v.id === selectedExtras[g.key])
        return sel ? { group: g.label, key: g.key, value: sel.label, price: sel.price_extra || 0 } : null
      })
      .filter(Boolean),
    ...festeWerte(extraOptionGroups),
    // Der Sohlenrand folgt dem Oberleder und ist deshalb kein Schritt mehr.
    // Er steht trotzdem in der Bestellung — siehe abgeleiteteWerte().
    ...abgeleiteteWerte(extraOptionGroups, { oberHex: col?.hex, soleKey: soleArt?.key }),
  ]
  // Was in den Entwurf geht — dieselben Felder, die später die Bestellung
  // trägt. Bewusst eine einzige Stelle: Zwei Stellen waren genau das Problem.
  const draftPayload = () => ({
    shoe_id: product.id, shoe_name: cleanShoeName(product.name),
    material: mat?.label || product.material,
    color, color_name: col?.name || null,
    sole: soleArt?.label || 'Standard',
    extras: extrasForCart,
    size_type: sizeType, eu_size: chosenEU,
    last_key: passform?.last_key || null,
    last_label: passform?.last_label || null,
    last_width: passform?.width || null,
    fit_measurements: footMeasurementsUsed,
    accessories: selectedAccessories,
    price: formatPrice(basePrice + extrasPriceTotal),
  })

  // Laufend sichern, sobald etwas gewählt ist. Ohne Material und Farbe gibt es
  // noch nichts zu speichern.
  useEffect(() => {
    if (!product?.id || !selMat || !selCol) return
    if (openDraft) return          // Rückfrage steht noch offen
    saveDraft(draftId, draftPayload())
  }, [product?.id, selMat, selCol, color, JSON.stringify(selectedExtras), sizeType, chosenEU,
      passform?.last_key, passform?.width, JSON.stringify(selectedAccessories), openDraft])

  // Beim Öffnen nachsehen, ob zu diesem Modell noch etwas Halbfertiges liegt.
  // Nur was weder im Warenkorb noch bestellt ist — alles andere ist erledigt
  // und keine liegengebliebene Arbeit.
  useEffect(() => {
    let abgebrochen = false
    if (!product?.id || !user || draftRestored) return
    findOpenDraft(product.id).then(d => {
      if (abgebrochen || !d) return
      // Nur fragen, wenn wirklich etwas gewählt wurde.
      const inhalt = d.material || d.color || (d.extras && d.extras !== '[]')
      if (inhalt) setOpenDraft(d)
    })
    return () => { abgebrochen = true }
  }, [product?.id, user, draftRestored])

  // „Ja, fortsetzen" — den gespeicherten Stand zurück in die Maske holen.
  const resumeDraft = () => {
    const d = openDraft
    if (!d) return
    const parse = (v, f) => { try { return JSON.parse(v ?? 'null') ?? f } catch { return f } }
    setDraftId(d.id)
    if (d.material) {
      const m = globalMatList.find(x => x.label === d.material)
      if (m) setSelMat(m.key)
    }
    // Im Entwurf steht der Farbwert und der Name, nicht der Schlüssel (siehe
    // draftPayload). Den Schlüssel gibt es erst, wenn die Farbliste zum
    // gerade gesetzten Leder steht, deshalb wird nachgeholt.
    if (d.color || d.color_name) setFarbeNachholen({ hex: d.color, name: d.color_name })
    const ex = parse(d.extras, [])
    if (ex.length) {
      const map = {}
      for (const e of ex) {
        const g = extraOptionGroups.find(x => x.label === e.group || x.key === e.key)
        const v = g?.values.find(v => v.label === e.value)
        if (g && v) map[g.key] = v.id
      }
      if (Object.keys(map).length) setSelectedExtras(map)
    }
    if (d.size_type) setSizeType(d.size_type)
    if (d.size_type === 'standard' && d.eu_size) setSelectedSize(d.eu_size)
    const acc = parse(d.accessories, [])
    if (Array.isArray(acc) && acc.length) setSelectedAccessories(acc)
    setDraftRestored(true)
    setOpenDraft(null)
  }

  // „Nein, neu anfangen" — Entwurf löschen und mit leerer Maske starten.
  const dropDraft = async () => {
    const id = openDraft?.id
    setOpenDraft(null)
    setDraftRestored(true)
    setDraftId(newDraftId())
    setSelMat(''); setSelCol(''); setSelectedExtras({})
    setSizeType(''); setSelectedSize(''); setSelectedAccessories([])
    setGuertelAn(null); setGuertelCfg(null)
    await discardDraft(id)
  }

  const addShoeToCart = () => {
    addToCart({
      shoeId: product.id, name: cleanShoeName(product.name),
      material: mat?.label || product.material,
      color, colorName: col?.name || null, price: formatPrice(basePrice + extrasPriceTotal),
      sole: soleArt?.label || 'Standard',
      image: product.image,
      sizeType, euSize: chosenEU,
      last: passform?.last_key || null,
      lastLabel: passform?.last_label || null,
      width: passform?.width || null,
      sizeSystem: selectedFit?.size_system || 'EU',
      footMeasurementsUsed,
      extras: extrasForCart,
      configId: draftId,
    })
    // Der Entwurf ist weitergereicht — beim nächsten Aufruf nicht mehr danach
    // fragen, sonst wirkt jede Wiederkehr wie liegengebliebene Arbeit.
    flushDraft(draftId, draftPayload()).then(() => markInCart(draftId))
  }

  const handleAddToCart = () => {
    // Prüfe ob derselbe Schuh in gleicher Konfiguration bereits im Warenkorb liegt
    const sameConfig = cart.find(c =>
      !c.isAccessory &&
      c.shoeId === product.id &&
      c.material === (mat?.label || product.material) &&
      c.color === color &&
      c.sole === (soleArt?.label || 'Standard')
    )

    if (sameConfig && selectedAccessories.length > 0) {
      // Gleiche Konfiguration + Zubehör ausgewählt → Modal
      setDuplicateDialog(true)
      return
    }

    if (sameConfig && selectedAccessories.length === 0) {
      // Schuh schon drin, kein Zubehör mehr → zum Warenkorb
      navigate('/checkout')
      return
    }

    // Neue Konfiguration → normal hinzufügen
    addShoeToCart()
    addAccessoriesToCart()
    setSelectedAccessories([])
    // Auch der Gürtel: Er liegt jetzt im Korb, und ein zweiter Klick auf
    // „In den Warenkorb" legte sonst denselben noch einmal dazu.
    setGuertelAn(null); setGuertelCfg(null)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleDuplicateChoice = (includeShoe) => {
    if (includeShoe) addShoeToCart()
    addAccessoriesToCart()
    setSelectedAccessories([])
    setGuertelAn(null); setGuertelCfg(null)
    setDuplicateDialog(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }


  const handleBuyNow = async () => {
    // Vor dem Wechsel zur Kasse ohne Verzögerung sichern: Ab hier ist der
    // Entwurf die Quelle, aus der die Bestellung entsteht.
    await flushDraft(draftId, draftPayload())
    await markInCart(draftId)
    const cartAccessories = selectedAccessories.map(id => {
      const acc = accessories.find(a => a.id === id)
      return acc ? { id: acc.id, name: acc.name, price: acc.price, color: acc.color, key: acc.key } : null
    }).filter(Boolean)

    navigate('/checkout', {
      state: {
        product: {
          id: product.id, name: cleanShoeName(product.name),
          // Das Bild für die Bestellübersicht der Kasse. Ohne stand dort beim
          // Direktkauf ein leerer Kasten, beim Weg über den Warenkorb nicht.
          image: product.image || null,
          material: mat?.label || product.material,
          color, colorName: col?.name || null, price: formatPrice(basePrice + extrasPriceTotal),
          sole: soleArt?.label || 'Standard',
          sizeType, euSize: chosenEU,
          last: passform?.last_key || null,
          lastLabel: passform?.last_label || null,
          width: passform?.width || null,
          sizeSystem: selectedFit?.size_system || 'EU',
          footMeasurementsUsed,
          // Ohne das fehlten beim Direktkauf sämtliche Zusatzoptionen —
          // Absatz, Welt, Sohlen- und Innenfarbe. Der Weg über den Warenkorb
          // führte sie mit, dieser nicht, und in der Bestellung stand am Ende
          // nur Leder, Farbe und Sohle.
          extras: extrasForCart,
          configId: draftId,
        },
        accessories: cartAccessories,
        // Der Gürtel geht als eigene Position mit. Er lässt sich nicht über
        // die Zubehör-Kennung mitführen wie die übrigen — von ihm gibt es
        // nicht einen, sondern einen je Konfiguration.
        guertel: guertelZeile,
      },
    })
  }

  const handleReview = async () => {
    if (!myRating) return
    setSubmitting(true)
    try {
      const row = await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ shoe_id: Number(product.id), rating: myRating, comment: myComment.trim() || null }),
      })
      setReviews(prev => [row, ...prev])
      setShowReview(false); setMyRating(0); setMyComment('')
    } catch { /* Die Bewertung bleibt im Feld stehen. */ } finally { setSubmitting(false) }
  }

  // Beschreibung und Bewertungen. Auf dem Telefon unter dem Schritt, wie
  // gehabt; passt die Seite ins Fenster, am Ende der Übersicht — dort, wo
  // jemand vor dem Kauf noch einmal liest, und ohne die Seite zu verlängern.
  const erzaehlung = (
    <div className="max-w-3xl mx-auto">
      <p className="t-text c-tinte">
        {product.description || (
          <>
            Jeder {product.name || 'Schuh'} entsteht einzeln auf Bestellung in Almansa, Spanien, in über 200 Arbeitsschritten.
            Aus Fußlänge und Ballenumfang bestimmen wir Leisten, Größe und Weite.
            Ausgesuchtes europäisches Leder, rahmengenähte Konstruktion und eine Passform, die du vom ersten Schritt an spürst.
          </>
        )}
      </p>
      <p className="t-klein c-leise mt-4">
        {(pageTexts?.badges?.length ? pageTexts.badges : ['Rahmengenäht', 'Custom Made', '200+ Schritte']).join(' · ')}
      </p>

      <div className="mt-12">
        <button
          onClick={() => setShowReview(v => !v)}
          className="w-full flex items-center justify-between bg-transparent border-0 p-0 pb-2 border-b border-black/8"
        >
          <div className="flex items-center gap-2">
            <span className="t-klein c-leise">Bewertungen</span>
            {reviews.length > 0 && (
              <>
                <Stars value={avg} size={10} />
                <span className="t-klein c-leise">({reviews.length})</span>
              </>
            )}
          </div>
          {showReview ? <ChevronUp size={14} className="text-black/30" /> : <ChevronDown size={14} className="text-black/30" />}
        </button>

        {showReview && (
          <div className="space-y-2 mt-3">
            {reviews.length === 0 && (
              <p className="t-klein c-leise text-center py-3">Noch keine Bewertungen.</p>
            )}
            {reviews.slice(0, 3).map(rev => (
              <div key={rev.id} className="border-b border-black/5 pb-3">
                <div className="flex items-center justify-between">
                  <span className="t-klein c-tinte">{rev.user_name}</span>
                  <Stars value={rev.rating} size={9} />
                </div>
                {rev.comment && <p className="t-klein c-leise mt-1">{rev.comment}</p>}
              </div>
            ))}

            {!myRev && product.id && (
              <div className="pt-2 space-y-2">
                <p className="t-klein c-leise">Deine Bewertung</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setMyRating(n)} className="bg-transparent border-0 p-0">
                      <Star size={22} className={n <= myRating ? 'text-black fill-black' : 'text-black/15'} strokeWidth={1} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={myComment} onChange={e => setMyComment(e.target.value)}
                  placeholder="Kommentar (optional)"
                  className="t-klein w-full bg-transparent border border-black/10 px-3 py-2 outline-none focus:border-black/30 resize-none"
                  rows={2} style={{ fontFamily: 'inherit' }}
                />
                <button onClick={handleReview} disabled={submitting || !myRating}
                  className="t-klein w-full h-11 g-akzent border-0 disabled:opacity-20 flex items-center justify-center gap-1.5">
                  <Send size={11} /> Absenden
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // ── Bausteine, die beide Aufbauten teilen ─────────────────────────────
  // Auf dem Telefon steht der Schritt unter dem Schuh, auf großen
  // Bildschirmen in der Spalte rechts. Die Inhalte sind dieselben; nur die
  // Ausrichtung wechselt: mittig unter dem Bild, bündig in der Spalte.
  const mitte = passt ? 'flex flex-col items-start text-left' : 'flex flex-col items-center text-center'
  // Erklärsätze: in der Spalte klein und leise — sie begleiten die Wahl, sie
  // sind nicht die Wahl. Vorher standen sie in Lesegröße über drei Zeilen,
  // und die Muster rutschten unter den Rand.
  const erklaer = passt ? 't-klein' : 't-text'

  // Was im großen Bild steht: Schrittbild, Foto oder die Zeichnung.
  const bildInhalt = schrittBild ? (
    // Kein Wechsel der `src` am selben Bild: Das neue müsste erst
    // dekodiert werden, und dazwischen stünde die Fläche leer.
    // Zwei Bilder übereinander, das obere blendet auf.
    <>
      <img src={gallery[activeSlide] || ''} alt=""
           onLoad={bildGeladen}
           className="w-full h-full object-contain"
           style={{ opacity: 0 }} />
      <img src={schrittBild} alt=""
           className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
           style={{ opacity: 1 }} />
    </>
  ) : gallery[activeSlide] ? (
    <img src={gallery[activeSlide]} alt={product.name} onLoad={bildGeladen} className="w-full h-full object-contain" />
  ) : (
    <svg viewBox="0 0 260 130" className="w-64 lg:w-80">
      <ellipse cx="130" cy="120" rx="100" ry="8" fill="#00000008" />
      <path d="M20 100 Q17 108 38 112 L222 112 Q238 112 238 100 L232 80 Q226 62 210 60 L72 60 Q47 60 42 68 Z" fill={color} />
      <path d="M42 68 Q37 48 62 36 L120 30 Q155 27 178 42 Q198 54 232 80 L210 60 Q180 50 148 52 L90 53 Q60 55 42 68 Z" fill={color} opacity="0.88" />
      <path d="M42 68 Q36 55 53 44 Q68 34 87 34 L87 53 Q63 55 42 68 Z" fill={color} />
      <path d="M87 53 L210 60 Q210 50 178 42 Q155 27 120 30 L87 34 Z" fill="white" opacity="0.1" />
      <path d="M90 38 Q115 30 148 31 Q175 31 198 44" stroke="white" strokeWidth="1" fill="none" opacity="0.12" />
    </svg>
  )

  // Der Inhalt des aktuellen Schritts.
  const schrittInhalt = (
    <>
      {/* Leder */}
      {schritt.key === '__leder' && (
        <div className={mitte}>
          <Wahlreihe
            ausrichtung={passt ? 'start' : 'mitte'}
            beschriftung="Leder"
            mitNamen
            werte={matList.map(m => ({
              id: m.key || String(m.id),
              label: m.label,
              bild: m.image ? resolveImg(m.image) : null,
              hex: m.color,
              gesperrt: m.available === 0 || m.available === false,
            }))}
            gewaehlt={selMat}
            onWahl={setSelMat}
            onZeigen={setKachelImZeiger}
          />
          {/* Der Satz, der das Leder erklärt — für jemanden, der
              kaufen will, die wichtigste Zeile dieses Schritts. */}
          {selMat && mat?.tip && (
            <p className={`${erklaer} c-tinte mt-6 max-w-2xl`}>{mat.tip}</p>
          )}
          {!selMat && (
            <p className={`${erklaer} c-leise mt-6 max-w-2xl`}>Wähl ein Leder. Die Farben kommen im nächsten Schritt.</p>
          )}
        </div>
      )}

      {/* Farbe */}
      {schritt.key === '__farbe' && (
        <div className={mitte}>
          <Wahlreihe
            ausrichtung={passt ? 'start' : 'mitte'}
            beschriftung="Farbe"
            werte={colList.map(c => ({
              id: c.key || String(c.id),
              label: c.name,
              bild: farbMuster(c),
              hex: c.hex,
              gesperrt: c.available === 0 || c.available === false,
            }))}
            gewaehlt={selCol}
            onWahl={setSelCol}
            onZeigen={setKachelImZeiger}
          />
          <p className="t-text c-tinte mt-4 min-h-[1.6em]">
            {selCol ? col?.name : <span className="c-leise">Wähl eine Farbe</span>}
            {mat?.label && <span className="t-klein c-leise ml-2">{mat.label}</span>}
          </p>
          {col?.pairs_with && selCol && <p className="t-klein c-leise mt-1">Passt zu: {col.pairs_with}</p>}
        </div>
      )}

      {/* Eine Optionsgruppe */}
      {schritt.gruppe && (() => {
        const group = schritt.gruppe
        const currentSelection = group.values.find(v => v.id === selectedExtras[group.key])
        const mitBild = group.values.filter(v => v.image || v.color_hex).length >= Math.ceil(group.values.length / 2)
        return (
          <div className={mitte}>
            {group.helper_text && (
              <p className={`${erklaer} c-leise mb-5 max-w-2xl`}>{group.helper_text}</p>
            )}
            <Wahlreihe
            ausrichtung={passt ? 'start' : 'mitte'}
              beschriftung={group.label}
              form={mitBild ? 'rund' : 'text'}
              mitNamen={mitBild && group.values.some(v => v.image && !v.color_hex)}
              werte={group.values.map(v => ({
                id: v.id,
                label: v.label,
                bild: v.image ? resolveImg(v.image) : null,
                hex: v.color_hex,
                preis: v.price_extra,
                empfohlen: !!v.recommended,
              }))}
              gewaehlt={selectedExtras[group.key]}
              onWahl={(id) => setSelectedExtras(prev => ({ ...prev, [group.key]: id }))}
              onZeigen={setKachelImZeiger}
            />
            {mitBild && (
              <p className="t-text c-tinte mt-4 min-h-[1.6em]">
                {currentSelection ? currentSelection.label : <span className="c-leise">Bitte wählen</span>}
              </p>
            )}
            {/* Beschreibung der gewählten Option */}
            {currentSelection?.description && (
              <p className={`${erklaer} c-leise mt-2 max-w-2xl`}>{currentSelection.description}</p>
            )}
            {/* Warum empfohlen — einmal je Gruppe, statt an jedem Knopf.
                Ein Stern ohne Begründung ist eine Behauptung. */}
            {group.values.some(v => v.recommended && v.recommendation_reason) && (
              <p className="t-klein c-leise mt-3 max-w-2xl inline-flex items-start gap-1.5">
                <Star size={12} strokeWidth={1.4} fill="currentColor" className="mt-[3px] shrink-0" />
                <span>
                  {group.values
                    .filter(v => v.recommended && v.recommendation_reason)
                    .map(v => `${v.label}: ${v.recommendation_reason}`)
                    .join(' · ')}
                </span>
              </p>
            )}
          </div>
        )
      })()}

      {/* Gürtel */}
      {schritt.key === '__guertel' && guertelMoeglich && (
        // Wie jeder andere Schritt: mittig, der Satz darüber, die Wahl
        // als zwei Worte. Vorher stand der Gürtel als einziger Schritt
        // linksbündig da, mit zwei Kästen, die aussahen wie ein Formular.
        <div className={mitte}>
          <p className={`${erklaer} c-leise mb-5 max-w-2xl`}>
            Aus demselben Leder in derselben Farbe wie deine Schuhe, 3,5 cm breit.
            {' '}Zusammen mit dem Paar{' '}
            <span className="c-tinte">
              € {Number(guertelOptionen.preis_zum_paar).toLocaleString('de-DE')}
            </span>
            {Number(guertelOptionen.preis_einzeln) > Number(guertelOptionen.preis_zum_paar) && (
              <> statt <span className="line-through">€ {Number(guertelOptionen.preis_einzeln).toLocaleString('de-DE')}</span> einzeln</>
            )}
            , er geht im selben Karton hinaus.
          </p>
          <Wahlreihe
            ausrichtung={passt ? 'start' : 'mitte'}
            beschriftung="Passender Gürtel"
            form="text"
            werte={[
              { id: 'ja', label: 'Ja, dazu', preis: Number(guertelOptionen.preis_zum_paar) || 0 },
              { id: 'nein', label: 'Nein, danke' },
            ]}
            gewaehlt={guertelAn === true ? 'ja' : guertelAn === false ? 'nein' : null}
            onWahl={(id) => {
              if (id === 'ja') setGuertelAn(true)
              else { setGuertelAn(false); setGuertelCfg(null) }
            }}
          />
          {guertelAn === true && (
            <div className="w-full max-w-xl mt-6 text-left">
              <GuertelWahl
                optionen={guertelOptionen}
                vorgabe={guertelVorgabe}
                onChange={setGuertelCfg}
              />
            </div>
          )}
        </div>
      )}

      {/* Passform — die Größe und die Leiste aus den Fußmaßen */}
      {schritt.key === '__passform' && (
        <div className="max-w-xl mx-auto">
        {sizeType === 'standard' && manuelleWahl ? (
          <div className="border border-black/10 p-4">
            <p className="t-klein c-leise mb-1.5">Selbst gewählt</p>
            <p className="t-text c-tinte">
              EU {String(manuelleWahl.size_label).replace('.', ',')}
              <span className="t-klein c-leise ml-2">
                · Weite {WEITEN_NAME[manuelleWahl.width] || manuelleWahl.width}
                {manuelleWahl.last_label ? ` · ${manuelleWahl.last_label}` : ''}
              </span>
            </p>
            <p className="t-klein c-leise mt-2">
              Ohne Maße bauen wir nach der Tabelle. Wenn du uns Fußlänge und
              Ballenumfang nennen, wählen wir Leisten und Weite passend dazu, das
              sitzt spürbar besser.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <button
                type="button" onClick={() => setGroessenOffen(true)}
                className="t-klein c-leise hover:text-black underline underline-offset-2 bg-transparent border-0 p-0"
              >
                Größe ändern
              </button>
              <button
                type="button"
                onClick={() => { setManuelleWahl(null); setSizeType(''); setSelectedSize(''); openMeasEdit('passform') }}
                className="t-klein c-leise hover:text-black underline underline-offset-2 bg-transparent border-0 p-0"
              >
                Lieber doch messen
              </button>
            </div>
            {measOpen && measAnchor === 'passform' && massFormular}
          </div>
        ) : !footMeasurements?.foot_length_mm ? (
          <div className="border border-black/10 p-4">
            {measOpen && measAnchor === 'passform' ? (
              massFormular
            ) : (
              <>
                <p className="t-klein c-leise mb-3">
                  Für die perfekte Passform messen wir deinen Fuß statt zu raten.
                  Gib Fußlänge und Ballenumfang ein, die passende Schuhform
                  und Größe ermitteln wir automatisch.
                </p>
                <button onClick={() => openMeasEdit('passform')} className="t-klein w-full h-12 g-akzent border-0 hover:opacity-90">
                  Maße eingeben
                </button>
                {/* Für den, der nicht messen will. Bewusst klein und
                    nachgeordnet: Es ist die schlechtere Wahl, und der
                    Text im Fenster sagt auch warum. */}
                <button
                  type="button"
                  onClick={() => setGroessenOffen(true)}
                  className="t-klein block w-full mt-2.5 c-leise hover:text-black/70 text-center underline underline-offset-4 bg-transparent border-0"
                >
                  Lieber ohne Maße? Größe selbst wählen
                </button>
              </>
            )}
          </div>
        ) : fitState === 'matching' ? (
          <p className="t-klein c-leise">Passform wird ermittelt…</p>
        ) : fitState === 'matched' ? (
          <div className="space-y-3">
            <div className="t-klein flex items-center gap-2 c-leise">
              <Check size={13} strokeWidth={2} className="text-black/40" />
              <span>
                {hatUmfang
                  ? 'Passform automatisch ermittelt, keine Größenwahl nötig.'
                  : `Größe aus deiner Fußlänge: ${selectedFit?.size_label ? `EU ${String(selectedFit.size_label).replace('.', ',')}` : 'noch offen'}.`}
              </span>
            </div>

            {/* Nur Länge gemessen → die Weite ist die offene Frage.
                Gefragt in denselben drei Worten wie im Größenfenster:
                Die Buchstaben D, EE und EEE sagen niemandem etwas, der
                nicht in einer Manufaktur gearbeitet hat. */}
            {!hatUmfang && (
              <div className="border border-black/10 p-3.5">
                <p className="t-klein c-leise mb-0.5">
                  Welche Weite brauchst du?
                </p>
                <p className="t-klein c-leise mb-2">
                  Die Zahl ist der Ballenumfang, nicht die Breite.
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {WEITEN_WAHL.filter(w => !weitenHier.length || weitenHier.some(x => x.width === w.key)).map(w => {
                    const an = gewaehlteWeite === w.key
                    const mm = weitenHier.find(x => x.width === w.key)?.ball_girth_mm
                    return (
                      <button
                        key={w.key} type="button"
                        onClick={() => setGewaehlteWeite(w.key)}
                        className={`text-left p-2.5 border transition-colors ${
                          an ? 'g-dunkel c-hell border-transparent' : 'bg-transparent border-black/15 hover:border-black/40'
                        }`}
                      >
                        <span className="t-klein block">{w.titel}</span>
                        {/* Die Zahl ist der Punkt: Erst sie macht aus
                            „normal oder breit?" etwas Nachprüfbares. */}
                        {mm != null && (
                          <span className={`t-klein block tabular-nums mt-0.5 ${an ? 'c-hell' : 'c-tinte'}`}>
                            {Math.round(mm)} mm
                            <span className={`t-klein ml-1 ${an ? 'c-hell-leise' : 'c-leise'}`}>Umf.</span>
                          </span>
                        )}
                        <span className={`t-klein block mt-0.5 ${an ? 'c-hell' : 'c-leise'}`}>
                          {w.kurz}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Ohne diese Erklärung ist die Millimeterzahl auf den
                    Knöpfen eine Zahl ohne Bezug. */}
                {weitenHier.length > 0 && (
                  <p className="t-klein c-leise mt-2.5">
                    Der Ballenumfang ist einmal um den Fuß herum gemessen, an der
                    breitesten Stelle, dort wo der große Zeh ansetzt, nicht die Breite
                    quer über den Fuß. Du brauchst kein Maßband: Leg einen
                    Schnürsenkel um den Ballen, markier die Stelle, wo er sich
                    trifft, und halt ihn an ein Lineal.
                  </p>
                )}
                <p className="t-klein c-leise mt-2">
                  {WEITEN_WAHL.find(w => w.key === gewaehlteWeite)?.hinweis}
                </p>

                {/* Der Umweg über bekannte Sneaker. Den eigenen Fuß
                    einzuschätzen gelingt niemandem — Schuhe zu
                    beurteilen, die man getragen hat, dagegen jedem. */}
                <div className="mt-3 pt-3 border-t border-black/[0.06]">
                  <p className="t-klein c-leise mb-2">
                    Nicht sicher? Woran du es merkst
                  </p>
                  <div className="space-y-1">
                    {SNEAKER_TEST.filter(t => WEITEN_WAHL.some(w => w.key === t.key)
                        && (!weitenHier.length || weitenHier.some(x => x.width === t.key))).map(t => {
                      const an = gewaehlteWeite === t.key
                      return (
                        <button
                          key={t.key} type="button"
                          onClick={() => setGewaehlteWeite(t.key)}
                          className={`w-full text-left px-3 py-2 border transition-colors ${
                            an ? 'border-black bg-black/[0.03]' : 'border-black/[0.08] hover:border-black/25 bg-transparent'
                          }`}
                        >
                          <span className={`t-klein block ${an ? 'c-tinte' : 'c-tinte'}`}>„{t.frage}"</span>
                          <span className="t-klein block c-leise mt-0.5">{t.folge}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="t-klein c-leise mt-2">
                    Anhaltspunkte, keine Messung, Sneaker sitzen ohnehin lockerer als
                    rahmengenähte Schuhe. Der gemessene Ballenumfang bleibt genauer.
                  </p>
                </div>
                <p className="t-klein c-leise mt-2 pt-2 border-t border-black/[0.06]">
                  Die Länge hast du gemessen, die Weite geschätzt. Wir merken uns das
                  und fragen vor der Fertigung nach, wenn etwas unstimmig wirkt, der
                  Schuh entsteht ohnehin erst in den Wochen danach. Genauer wird es mit
                  dem gemessenen Ballenumfang.
                  {' '}
                  <button
                    type="button" onClick={() => openMeasEdit('passform')}
                    className="t-klein underline underline-offset-2 bg-transparent border-0 p-0 c-leise hover:text-black"
                  >
                    Umfang jetzt eintragen
                  </button>
                </p>
              </div>
            )}
            {/* Die Schuhform wird genannt, nicht zur Wahl gestellt.

                Hier standen drei Kacheln — „Drivers", „Venetian",
                „Penny Loafer" —, sobald mehrere Leisten zu den Maßen
                passten. Es war eine Frage, die der Kunde nicht
                beantworten kann: Die Leisten unterscheiden sich in
                Millimetern an Zehenraum und Taille, und welche davon
                seinem Fuß entspricht, hat der Matcher gerade
                ausgerechnet. Ihn danach noch einmal zu fragen, hieß,
                seine eigene Rechnung zur Diskussion zu stellen.

                `chosenLast` steht weiterhin auf dem besten Treffer —
                `applyMatches` setzt ihn, und der Abgleich weiter oben
                hält ihn auf einer Form, die dieses Modell auch führt.
                Die Angabe geht unverändert in Entwurf und Bestellung;
                die Werkstatt braucht sie.

                Dieselbe Haltung wie im Größenfenster
                (GroessenTabelle.jsx): „Die Schuhform, nicht als
                Frage." */}
            {gewaehlteLeiste && (
              <div>
                <p className="t-klein c-leise">
                  Schuhform: <span className="text-black/70">{gewaehlteLeiste.label}</span>
                  {gewaehlteLeiste.match?.fitPercent != null && (
                    <span className="text-black/35"> · {String(gewaehlteLeiste.match.fitPercent).replace('.', ',')} % Passgenauigkeit</span>
                  )}
                </p>
                {gewaehlteLeiste.description && (
                  <p className="t-klein c-leise mt-1.5">{gewaehlteLeiste.description}</p>
                )}
              </div>
            )}
            <button type="button" onClick={() => openMeasEdit('passform')} className="t-klein c-leise hover:text-black/60 underline underline-offset-2 bg-transparent border-0 p-0">Maße ändern</button>
          </div>
        ) : fitState === 'error' ? (
          /* Transienter Fehler, KEINE Custom-Anfrage vorschnell anbieten */
          <div className="border border-black/10 p-4">
            <p className="t-klein c-leise mb-3">
              Die Passform konnte gerade nicht geladen werden. Bitte versuch
              es noch einmal, deine gespeicherten Maße bleiben erhalten.
            </p>
            <button
              onClick={() => setFitRetryKey(k => k + 1)}
              className="t-klein w-full h-12 g-akzent border-0 hover:opacity-90"
            >
              Erneut versuchen
            </button>
            <button type="button" onClick={() => openMeasEdit('passform')} className="t-klein block w-full mt-2 c-leise hover:text-black/60 text-center underline underline-offset-2 bg-transparent border-0 p-0">Maße ändern</button>
          </div>
        ) : (
          /* Maße vorhanden, aber kein Treffer, Custom-Anfrage */
          <div className="border border-black/10 p-4">
            <p className="t-klein c-leise mb-3">
              Für deine Maße finden wir keine Standard-Passform. Wir fertigen
              diesen Schuh gerne custom-made für dich an.
            </p>
            <button
              onClick={() => setCustomRequestOpen(true)}
              className="t-klein w-full h-12 g-akzent border-0 hover:opacity-90"
            >
              Custom Made anfragen
            </button>
            {/* Wer trotzdem lieber eine Standardgröße nimmt, soll das
                können, die Anfrage ist ein Angebot, keine Sackgasse. */}
            <button
              type="button" onClick={() => setGroessenOffen(true)}
              className="t-klein block w-full mt-2 c-leise hover:text-black/70 text-center underline underline-offset-4 bg-transparent border-0"
            >
              Oder eine Standardgröße selbst wählen
            </button>
            <button type="button" onClick={() => openMeasEdit('passform')} className="t-klein block w-full mt-2 c-leise hover:text-black/60 text-center underline underline-offset-2 bg-transparent border-0 p-0">Maße ändern</button>
          </div>
        )}

        {/* Sind bereits Maße hinterlegt, hängt das Formular unten am
            Block, der Fall ohne Maße zeigt es weiter oben anstelle des
            Hinweistextes. */}
        {measOpen && measAnchor === 'passform' && footMeasurements?.foot_length_mm && massFormular}
        {/* Test-Detail: Leisten-Sollmaße vs. Fußmaße (zur Überprüfung) */}
        {fitState === 'matched' && selectedFit?.foot_length_mm != null && footMeasurements?.foot_length_mm && (
          <div className="mt-2 max-w-md">
            <table className="t-klein w-full c-leise border-collapse">
              <thead>
                <tr className="text-black/35">
                  <th className="text-left font-normal py-1 pr-2"></th>
                  <th className="text-right font-normal py-1 px-2">Deine Maße</th>
                  <th className="text-right font-normal py-1 px-2">Leiste {selectedFit.last_label} {selectedFit.width}</th>
                  <th className="text-right font-normal py-1 pl-2">Abweichung</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-black/10">
                  <td className="text-left py-1 pr-2">Länge</td>
                  <td className="text-right py-1 px-2 tabular-nums">{footMeasurements.foot_length_mm} mm</td>
                  <td className="text-right py-1 px-2 tabular-nums">{selectedFit.foot_length_mm} mm</td>
                  <td className="text-right py-1 pl-2 tabular-nums">{selectedFit.deltaLength > 0 ? '+' : ''}{String(selectedFit.deltaLength).replace('.', ',')} mm</td>
                </tr>
                <tr className="border-t border-black/10">
                  <td className="text-left py-1 pr-2">Ballenumfang</td>
                  <td className="text-right py-1 px-2 tabular-nums">{footMeasurements.ball_girth_mm} mm</td>
                  <td className="text-right py-1 px-2 tabular-nums">{selectedFit.ball_girth_mm} mm</td>
                  <td className="text-right py-1 pl-2 tabular-nums">{selectedFit.deltaGirth > 0 ? '+' : ''}{String(selectedFit.deltaGirth).replace('.', ',')} mm</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Nomatch: gespeicherte Maße bleiben sichtbar (zur Kontrolle/Änderung) */}
        {fitState === 'nomatch' && footMeasurements?.foot_length_mm && (
          <p className="t-klein c-leise mt-1.5">
            Deine gespeicherten Maße: {footMeasurements.foot_length_mm} mm Länge · {footMeasurements.ball_girth_mm} mm Ballenumfang.
            {' '}Für dieses Modell liegt keine Standard-Leiste in deinem Bereich vor, wir fertigen es custom-made auf Bestellung.
          </p>
        )}
        </div>
      )}

      {/* Übersicht — alles, was gewählt ist, dazu Zubehör und Kauf */}
      {schritt.key === '__uebersicht' && (
        <>
        <div className={passt ? 'space-y-10' : 'grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14'}>
          <div className={passt ? '' : 'lg:col-span-5'}>
            {!passt && <p className="t-lead c-tinte mb-4">Deine Konfiguration</p>}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="t-klein c-leise">Leder</span>
                <span className="t-klein c-tinte">{mat?.label}{mat?.sub ? ` · ${mat.sub}` : ''}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="t-klein c-leise">Farbe</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                  <span className="t-klein c-tinte">{col?.name}</span>
                </div>
              </div>
              {/* Sohle wird als Optionsgruppe "Sohlen-Art" unten gelistet. */}
              {/* Dynamische Extras (Last, Welt, Heel, Toe, Schnalle, …) */}
              {sichtbareGruppen.map(group => {
                const sel = group.values.find(v => v.id === selectedExtras[group.key])
                if (!sel) return null
                return (
                  <div key={group.id} className="flex items-center justify-between">
                    <span className="t-klein c-leise">{group.label}</span>
                    <div className="flex items-center gap-2">
                      {sel.color_hex && (
                        <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: sel.color_hex }} />
                      )}
                      <span className="t-klein c-tinte">
                        {sel.label}
                        {sel.price_extra > 0 && ` (+€${sel.price_extra})`}
                      </span>
                    </div>
                  </div>
                )
              })}
              {/* Leisten und Weite gehören sichtbar dazu: Sie bestimmen,
                  wie der Schuh sitzt, und standen bisher nur in der
                  Bestellansicht des Betreibers. */}
              {passform?.last_label && (
                <div className="flex items-center justify-between">
                  <span className="t-klein c-leise">Leisten</span>
                  <span className="t-klein c-tinte">{passform.last_label}</span>
                </div>
              )}
              {passform?.width && (
                <div className="flex items-center justify-between">
                  <span className="t-klein c-leise">Weite</span>
                  <span className="t-klein c-tinte">{WEITEN_NAME[passform.width] || passform.width}</span>
                </div>
              )}
              {sizeType === 'fit' && selectedFit?.size_label && (
                <div className="flex items-center justify-between">
                  <span className="t-klein c-leise">Größe</span>
                  <span className="t-klein c-tinte">EU {selectedFit.size_label}</span>
                </div>
              )}
              {sizeType === 'custom' && (
                <div className="flex items-center justify-between">
                  <span className="t-klein c-leise">Größe</span>
                  <span className="t-klein c-tinte">Custom Made</span>
                </div>
              )}
              {(sizeType === 'standard' && selectedSize) && (
                <div className="flex items-center justify-between">
                  <span className="t-klein c-leise">Größe</span>
                  <span className="t-klein c-tinte">EU {selectedSize}</span>
                </div>
              )}
              {/* Der Gürtel bekommt eine eigene Zeile. Er ist kein
                  angehaktes Zubehör, sondern eine konfigurierte Position
                  — und in der Zubehör-Zeile mitgezählt wäre er ein
                  Betrag ohne Stück. */}
              {guertelPreis > 0 && (
                <div className="flex items-center justify-between pt-1 mt-1 border-t border-black/5">
                  <span className="t-klein c-leise">Gürtel</span>
                  <span className="t-klein c-tinte">+€{guertelPreis}</span>
                </div>
              )}
              {selectedAccessories.length > 0 && (
                <div className="flex items-center justify-between pt-1 mt-1 border-t border-black/5">
                  <span className="t-klein c-leise">Zubehör</span>
                  <span className="t-klein c-tinte">
                    {selectedAccessories.length}×
                    {accDiscount > 0
                      ? <> <span className="line-through text-black/25">€{zubehoerTotal}</span> €{zubehoerTotal - accDiscount}</>
                      : <> (+€{zubehoerTotal})</>
                    }
                  </span>
                </div>
              )}
            </div>
            <div className="mt-8">
              <p className="t-klein c-leise mb-2">Im Karton</p>
              <ul className="space-y-1">
                {(pageTexts?.delivery_items?.length ? pageTexts.delivery_items : LIEFERUMFANG).map((item) => (
                  <li key={item} className="t-text c-tinte">{item}</li>
                ))}
              </ul>
            </div>
          <div className="mt-3 flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handleSaveConfiguration}
              disabled={savingConfig}
              className="t-klein inline-flex items-center gap-1.5 c-leise hover:text-black/75 underline underline-offset-2 bg-transparent border-0 p-0 disabled:opacity-40"
            >
              <Heart size={12} strokeWidth={1.5} /> {savingConfig ? 'wird gespeichert …' : 'Konfiguration speichern'}
            </button>
            {savedToast === 'saved' && (
              <span className="t-klein c-leise">Gespeichert · im Profil unter „Meine Konfigurationen"</span>
            )}
            {savedToast === 'login' && (
              <button type="button" onClick={goToLogin}
                className="t-klein c-leise underline underline-offset-2 bg-transparent border-0 p-0">
                Zum Speichern bitte anmelden
              </button>
            )}
          </div>
          </div>
          <div className={passt ? '' : 'lg:col-span-7'}>
            <p className="t-lead c-tinte mb-4">Passend dazu</p>
            <div className={`grid grid-cols-2 gap-4 ${passt ? '' : 'lg:grid-cols-3'}`}>
              {accessories.map((acc) => {
                const selected = selectedAccessories.includes(acc.id)
                return (
                  <button
                    key={acc.id}
                    onClick={() => toggleAccessory(acc.id)}
                    className="relative text-left group"
                  >
                    {/* Product image area */}
                    <div
                      className="w-full rounded-sm overflow-hidden flex items-center justify-center"
                      style={{
                        aspectRatio: '1',
                        background: '#f6f5f3',
                        border: selected ? '1.5px solid black' : '1.5px solid transparent',
                      }}
                    >
                      {acc.image ? (
                        <img
                          src={resolveImg(acc.image)}
                          alt={acc.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg transition-transform group-hover:scale-110"
                          style={{ background: acc.color, opacity: 0.7 }}
                        />
                      )}
                      {/* Toggle badge */}
                      <div
                        className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-all"
                        style={{
                          background: selected ? 'black' : 'white',
                          border: selected ? '1.5px solid black' : '1.5px solid rgba(0,0,0,0.12)',
                        }}
                      >
                        {selected
                          ? <Check size={11} className="text-white" strokeWidth={2.5} />
                          : <Plus size={11} className="text-black/30" strokeWidth={2} />
                        }
                      </div>
                    </div>

                    {/* Info below */}
                    <p className="t-klein c-tinte mt-2 px-0.5">{acc.name}</p>
                    {isPromo && wirksamerPct > 0 ? (
                      <div className="flex items-center gap-1.5 px-0.5">
                        <span className="t-klein c-leise line-through">€{acc.price}</span>
                        <span className="t-klein c-tinte">€{Math.round(acc.price * (1 - wirksamerPct / 100))}</span>
                      </div>
                    ) : (
                      <p className="t-klein c-leise px-0.5">€{acc.price}</p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        {passt && (
          <div className="mt-12 pt-10 border-t border-black/8">
            {erzaehlung}
          </div>
        )}
        </>
      )}
    </>
  )

  // Der eine Knopf, der jetzt dran ist — bis zur Übersicht „Weiter", dort
  // „Warenkorb" und „Jetzt kaufen".
  const kaufKnoepfe = (
    <>{schritt.key !== '__uebersicht' ? (
      <button
        type="button"
        onClick={weiter}
        disabled={!weiterFrei}
        className="t-klein h-12 px-6 sm:px-9 g-akzent border-0 inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-35 transition-opacity"
      >
        Weiter <ArrowRight size={16} strokeWidth={1.6} />
      </button>
    ) : needsCustomRequest ? (
      <button
        type="button"
        onClick={() => setCustomRequestOpen(true)}
        className="t-klein h-12 px-6 sm:px-9 g-akzent border-0 inline-flex items-center gap-2 hover:opacity-90"
      >
        <Send size={16} strokeWidth={1.5} /> Custom Made anfragen
      </button>
    ) : (
      <>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!fitReady}
          aria-label={added ? 'Hinzugefügt' : 'In den Warenkorb'}
          className={`t-klein h-12 px-4 sm:px-6 inline-flex items-center gap-2 border transition-colors disabled:opacity-35 ${
            added ? 'g-dunkel c-hell border-transparent' : 'bg-transparent c-tinte border-black/25 hover:border-black/60'
          }`}
        >
          {added ? <Check size={16} strokeWidth={1.6} /> : <ShoppingBag size={16} strokeWidth={1.5} />}
          <span className="hidden sm:inline">{added ? 'Hinzugefügt' : 'Warenkorb'}</span>
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!fitReady}
          className="t-klein h-12 px-6 sm:px-9 g-akzent border-0 hover:opacity-90 disabled:opacity-35 transition-opacity"
        >
          Jetzt kaufen
        </button>
      </>
    )}</>
  )
  const kaufHinweis = (
    <>{schritt.key === '__uebersicht' && !needsCustomRequest && !fitReady && (
      <p className="t-klein c-leise mt-1.5">
        {guertelUnfertig
          ? 'Bitte den Gürtel noch zu Ende wählen: Form, Metall und Größe.'
          : 'Bitte zuerst die Passform ermitteln.'}
      </p>
    )}</>
  )

  // Name, Preis und was dazu gehört — links neben dem Schuh auf dem Telefon,
  // oben in der Spalte auf großen Bildschirmen.
  const produktText = (
    <>
    <h1 className="t-kopf c-tinte"><ShoeName name={product.name} /></h1>
    {product.tagline && (
      <p className="t-text c-leise mt-2 max-w-md">{product.tagline}</p>
    )}
    {lockedDecoLabel && (
      <p className="t-klein c-leise mt-2">Ausführung: {lockedDecoLabel}</p>
    )}
    <p className="t-lead c-tinte mt-2 lg:mt-4 tabular-nums">
      {totalDiscount > 0 && (
        <span className="c-leise line-through mr-2">{formatPrice(priceBeforeDiscount)}</span>
      )}
      {displayPrice}
    </p>
    {/* In der Spalte steht der Hinweis gleich am Preis — dort, wo man ihn
        liest. Auf dem Telefon steht er in der Leiste unten. */}
    {passt && <Preishinweis className="mt-1" mitVersandlink />}
    {preisAufschlaege.length > 0 && (
      <p className="t-klein c-leise mt-1">inkl. {preisAufschlaege.join(' · ')}</p>
    )}
    {/* Woher der Nachlass kommt — sonst wirkt ein abweichender Preis
        wie ein Fehler. */}
    {totalDiscount > 0 && (
      <p className="t-klein c-leise mt-1">
        {affNachlass >= hausNachlass && affiliatePct > 0
          ? <>Empfehlung {affiliate.code.toUpperCase()} · {satzText(wirksamerPct)} %</>
          : campaignForShoe && campaignPct >= userPct
            ? <>{campaignForShoe.business_name || campaignForShoe.name} · {satzText(wirksamerPct)} % Firmenkondition</>
            : <>{satzText(wirksamerPct)} % Sonderkondition</>}
        , du sparst {formatPrice(totalDiscount)}
      </p>
    )}
    {/* In der Spalte eine Zeile statt zwei: Lieferzeit und Passform. */}
    {passt ? (
      <p className="t-klein c-leise mt-3">
        Rahmengenäht · 4 bis 6 Wochen
        {fitState === 'matched' && selectedFit?.fitPercent != null && (
          <> · Passform {String(selectedFit.fitPercent).replace('.', ',')} %</>
        )}
      </p>
    ) : (
      <p className="t-klein c-leise mt-5 hidden sm:block">Rahmengenäht · Almansa, Spanien · 4 bis 6 Wochen Produktion</p>
    )}
    {!passt && fitState === 'matched' && selectedFit?.fitPercent != null && (
      <p className="t-klein c-leise mt-3">
        Passgenauigkeit {String(selectedFit.fitPercent).replace('.', ',')} %
        {selectedFit?.last_label ? ` · Leisten ${selectedFit.last_label} ${selectedFit.width || ''}` : ''}
      </p>
    )}
    {/* Vor der Konfiguration, nicht darunter: Was hier eingeschränkt
        ist, muss man wissen, bevor man anfängt zu wählen. */}
    {Number(product.express) === 1 && (
      <ExpressHinweis
        wochen={product.express_weeks || 2}
        aufpreis={Number(product.express_surcharge) || 0}
        className="mt-4"
      />
    )}
    </>
  )

  const herzKnopf = (
    <button
      aria-label={isFav ? 'Von der Merkliste nehmen' : 'Auf die Merkliste'}
      onClick={async () => {
        if (!user) {
          goToLogin()
          return
        }
        const result = await toggleFavorite(product.id)
        if (result === 'unauthenticated') {
          goToLogin()
        }
      }}
      className="w-11 h-11 flex items-center justify-center border-0 bg-transparent c-tinte"
    >
      <Heart size={18} className={isFav ? 'fill-current' : ''} strokeWidth={1.4} />
    </button>
  )

  // ── Großer Bildschirm: Bild links, Spalte rechts ───────────────────────
  // So stellen die großen Häuser ihre Stücke aus: das Produkt groß und frei,
  // daneben eine ruhige Spalte mit Name, Preis, der einen Frage, die gerade
  // dran ist, und einem Knopf. Vorher standen drei Spalten nebeneinander,
  // das Foto als kleiner grauer Kasten dazwischen, darunter eine Leiste mit
  // Pfeilen und unten eine zweite mit Name, Preis und Knopf noch einmal.
  const luxAufbau = (
    <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,1.5fr)_minmax(400px,1fr)]">
      {/* Das Bild, randlos. Die Fläche trägt die Grundfarbe des Fotos, so
          endet es nirgends sichtbar. Bedient wird es durch Wischen, die
          Striche unten und — mit der Maus — die Ränder. */}
      <div
        {...bildSwipe}
        className="group relative min-h-0 overflow-hidden select-none transition-[background-color] duration-700"
        style={{ backgroundColor: bildFarbe || 'var(--grund-erzaehlung)', cursor: is3D ? 'grab' : 'default' }}
      >
        <div data-buehne-bild className="absolute inset-0 px-[7%] py-[9%]">
          <div className="relative w-full h-full flex items-center justify-center">
            {bildInhalt}
          </div>
        </div>

        {slideCount > 1 && !is3D && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goSlide(-1) }}
              aria-label="Vorheriges Bild"
              className="absolute inset-y-0 left-0 w-[14%] flex items-center justify-start pl-6 bg-transparent border-0 c-tinte opacity-0 group-hover:opacity-60 hover:!opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              <ChevronLeft size={26} strokeWidth={1} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goSlide(1) }}
              aria-label="Nächstes Bild"
              className="absolute inset-y-0 right-0 w-[14%] flex items-center justify-end pr-6 bg-transparent border-0 c-tinte opacity-0 group-hover:opacity-60 hover:!opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              <ChevronRight size={26} strokeWidth={1} />
            </button>
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSlide(i) }}
                  aria-label={`Ansicht ${i + 1} von ${slideCount}`}
                  aria-current={i === activeSlide}
                  className="h-6 px-0.5 flex items-center bg-transparent border-0"
                >
                  <span className={`block h-[2px] w-8 transition-colors duration-300 ${
                    i === activeSlide ? 'bg-[var(--tinte)]' : 'bg-[var(--tinte)] opacity-20 hover:opacity-50'
                  }`} />
                </button>
              ))}
            </div>
          </>
        )}

        {model3d && (
          <button
            type="button"
            onClick={() => { setIs3D(v => !v); setZoomed(false) }}
            aria-label={is3D ? '3D-Ansicht schließen' : '3D-Ansicht öffnen'}
            className="t-klein absolute left-6 bottom-6 h-9 px-3 inline-flex items-center gap-2 bg-transparent border border-black/15 c-tinte hover:border-black/40 transition-colors"
          >
            <Box size={14} strokeWidth={1.4} /> {is3D ? 'Foto' : '3D'}
          </button>
        )}
        {is3D && model3d && <ShoeModelViewer src={resolveImg(model3d)} />}
        {is3D && model3d && (
          <p className="t-klein c-leise absolute top-6 inset-x-0 text-center pointer-events-none">Ziehen zum Drehen</p>
        )}
      </div>

      {/* Die Spalte. Oben Name und Preis, in der Mitte der Schritt — nur er
          scrollt, wenn er mehr zu sagen hat —, unten der Fortschritt und
          der Knopf. */}
      <aside className="min-h-0 flex flex-col g-angebot">
        <div className="shrink-0 flex items-center justify-between px-4 xl:px-8 h-16">
          <button onClick={() => navigate(-1)} aria-label="Zurück" className="w-11 h-11 flex items-center justify-center border-0 bg-transparent c-tinte">
            <ArrowLeft size={20} strokeWidth={1.4} />
          </button>
          <div className="flex items-center gap-1">
            <button aria-label="Teilen" className="w-11 h-11 flex items-center justify-center border-0 bg-transparent c-tinte">
              <Share2 size={18} strokeWidth={1.4} />
            </button>
            {herzKnopf}
          </div>
        </div>

        {/* Name und Preis bleiben stehen; darunter nur der Schritt. Er
            beginnt bei jedem Wechsel oben (`key`), statt dort, wo der
            vorige aufgehört hat. */}
        <div className="shrink-0 px-8 xl:px-14 pt-1">
          <div className="max-w-[460px]">
            <p className="t-klein c-leise uppercase tracking-[0.16em]">Custom Made</p>
            <div className="mt-2">{produktText}</div>
            <div className="h-px bg-black/[0.08] mt-6" />
          </div>
        </div>
        <div
          id="konfig-wahl"
          key={schritt.key}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-8 xl:px-14 pt-6 pb-10 [scrollbar-width:thin] animate-[fadeIn_0.4s_ease]"
        >
          <div className="max-w-[460px]">
            <h2 className="t-lead c-tinte mb-5">{schritt.titel}</h2>
            {schrittInhalt}
          </div>
        </div>

        <div className="shrink-0 px-8 xl:px-14 pt-4 pb-5 border-t border-black/[0.07]">
          <div className="max-w-[460px]">
            <Fortschritt
              schritte={schritte}
              aktuell={schritt.key}
              erreichbar={erreichbar}
              onSprung={geheZu}
              onZurueck={zurueck}
              onMenue={() => setMenueOffen(true)}
            >
              {kaufKnoepfe}
            </Fortschritt>
            {kaufHinweis}
          </div>
        </div>
      </aside>
    </div>
  )

  return (
    <>
    {/* Rückfrage bei liegengebliebener Konfiguration. Bewusst eine Frage und
        keine stille Wiederherstellung: Wer neu anfangen will, soll nicht erst
        Feld für Feld zurücksetzen müssen. */}
    {/* Per Portal an den Seitenkörper: Der Seitenwechsel-Container darüber
        trägt ein transform, und das macht position:fixed relativ zu ihm statt
        zum Fenster — der Dialog landete dadurch weit unterhalb des sichtbaren
        Bereichs statt darüber. */}
    {openDraft && createPortal((
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 px-4">
        <div className="haus g-angebot w-full max-w-md p-6">
          <p className="t-klein c-leise mb-3">Unfertige Konfiguration</p>
          <p className="t-text c-tinte">
            Du hast diesen Schuh schon einmal zusammengestellt und nicht in den
            Warenkorb gelegt. Dort fortfahren?
          </p>
          <div className="mt-4 mb-5 border border-black/[0.08] px-4 py-3 space-y-1">
            {[
              ['Leder', openDraft.material],
              ['Farbe', openDraft.color_name || openDraft.color],
              ['Sohle', openDraft.sole],
              ['Größe', openDraft.eu_size && `EU ${openDraft.eu_size}`],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="t-klein c-leise">{k}</span>
                <span className="t-klein c-tinte">{v}</span>
              </div>
            ))}
            {(() => {
              let n = 0
              try { n = (JSON.parse(openDraft.extras || '[]') || []).length } catch { n = 0 }
              return n ? (
                <div className="flex justify-between">
                  <span className="t-klein c-leise">Weitere Optionen</span>
                  <span className="t-klein c-tinte">{n}</span>
                </div>
              ) : null
            })()}
          </div>
          <div className="flex gap-2">
            <button onClick={resumeDraft}
              className="t-klein flex-1 h-12 g-akzent border-0">
              Ja, fortfahren
            </button>
            <button onClick={dropDraft}
              className="t-klein flex-1 h-12 bg-transparent c-tinte border border-black/20">
              Nein, neu
            </button>
          </div>
        </div>
      </div>
    ), document.body)}
    <div
      ref={seiteRef}
      className={`haus flex flex-col ${passt ? 'overflow-hidden' : 'min-h-full'}`}
      style={passt ? { height: seitenHoehe } : undefined}
    >
    <div className={`g-angebot flex-1 flex flex-col ${passt ? 'min-h-0' : ''}`}>

      {passt ? luxAufbau : (<>
      {/* ── Kopf ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 g-angebot shrink-0 flex items-center justify-between px-2 lg:px-6 h-14">
        <button onClick={() => navigate(-1)} aria-label="Zurück" className="w-11 h-11 flex items-center justify-center border-0 bg-transparent c-tinte">
          <ArrowLeft size={20} strokeWidth={1.4} />
        </button>
        <div className="flex items-center gap-1">
          <button aria-label="Teilen" className="w-11 h-11 flex items-center justify-center border-0 bg-transparent c-tinte">
            <Share2 size={18} strokeWidth={1.4} />
          </button>
          {herzKnopf}
        </div>
      </div>

      {/* ── Bühne ────────────────────────────────────────────────────────
          Wie beim Rolex-Konfigurator: links groß der Name und der Preis, in
          der Mitte groß der Schuh, rechts die Ansichten als runde Bilder.
          Auf dem Telefon steht der Schuh zuerst, Name und Preis darunter. */}
      <section className="px-4 lg:px-10">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 lg:gap-x-10 items-start">
          <div className="order-2 lg:order-1 lg:col-span-4 pt-3 lg:pt-10">
            {produktText}
          </div>

          <div className="order-1 lg:order-2 lg:col-span-7">
            <div
              {...bildSwipe}
              className="relative overflow-hidden select-none w-full flex items-center justify-center h-[34vh] min-h-[230px] lg:h-[48vh] lg:min-h-[380px]"
              style={{ cursor: is3D ? 'grab' : 'default', containerType: 'size' }}
            >
            {/* Der Rahmen hat die Form des Fotos und ist so groß, wie es in
                die Fläche passt. Alles, was auf dem Bild liegen soll — Pfeile,
                Zoom, Punkte —, sitzt in ihm. Vorher hingen die Knöpfe an der
                ganzen Spalte, und das Foto stand schmaler in ihrer Mitte: Die
                Pfeile schwebten neben dem Schuh im Leeren. */}
            <div
              data-buehne-bild
              className="relative overflow-hidden bild-im-grund"
              style={bildSeite ? {
                width: `min(100cqw, calc(100cqh * ${bildSeite}))`,
                height: `min(100cqh, calc(100cqw / ${bildSeite}))`,
              } : { width: '100%', height: '100%' }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: zoomed ? 'scale(1.6)' : 'none',
                  transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
              {bildInhalt}
            </div>

            {/* Slideshow: Pfeile und Punkte. Nur wenn es wirklich mehr als
                eine Ansicht gibt — bei einem einzelnen Bild wären die
                Bedienelemente nur Dekoration. */}
            {slideCount > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goSlide(-1) }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center bg-white/85 backdrop-blur-sm border border-black/10 text-black/70 hover:text-black hover:bg-white transition-colors"
                  aria-label="Vorheriges Bild"
                >
                  <ChevronLeft size={16} strokeWidth={1.5} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goSlide(1) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center bg-white/85 backdrop-blur-sm border border-black/10 text-black/70 hover:text-black hover:bg-white transition-colors"
                  aria-label="Nächstes Bild"
                >
                  <ChevronRight size={16} strokeWidth={1.5} />
                </button>
              </>
            )}

            {/* Steuerungs-Icons links unten */}
            <div className="absolute left-4 bottom-4 flex items-center gap-2">
              {/* Nur anbieten, wenn für dieses Modell auch wirklich eine
                  3D-Datei hinterlegt ist. Vorher stand der Knopf immer da und
                  kippte das flache Foto per CSS-Perspektive — aus jedem Winkel
                  außer frontal sah man ein verzerrtes Bild statt eines
                  gedrehten Schuhs. */}
              {model3d && (
                <button
                  onClick={() => { setIs3D(v => !v); setZoomed(false) }}
                  aria-label={is3D ? '3D-Ansicht schließen' : '3D-Ansicht öffnen'}
                  className={`w-8 h-8 flex items-center justify-center border transition-all ${
                    is3D ? 'bg-black text-white border-black' : 'bg-white/90 text-black border-black/10'
                  }`}
                >
                  <Box size={14} strokeWidth={1.5} />
                </button>
              )}
              <button
                onClick={() => { setZoomed(v => !v); setIs3D(false) }}
                aria-label={zoomed ? 'Verkleinern' : 'Vergrößern'}
                className={`w-8 h-8 flex items-center justify-center border transition-all ${
                  zoomed ? 'bg-black text-white border-black' : 'bg-white/90 text-black border-black/10'
                }`}
              >
                {zoomed ? <ZoomOut size={14} strokeWidth={1.5} /> : <ZoomIn size={14} strokeWidth={1.5} />}
              </button>
            </div>

            {is3D && model3d && <ShoeModelViewer src={resolveImg(model3d)} />}

            {/* 3D-Hinweis */}
            {is3D && model3d && (
              <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
                <span className="t-klein c-leise">
                  Ziehen zum Drehen
                </span>
              </div>
            )}

            {/* Ein Indikator für die Bilderstrecke. Vorher standen hier zwei
                Reihen übereinander: diese, gespeist aus einem hartcodierten
                Platzhalter von drei Bildern, und eine zweite aus der echten
                Slideshow. Jetzt eine, mittig, anklickbar. */}
            {slideCount > 1 && !is3D && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setSlide(i); setZoomed(false) }}
                    aria-label={`Bild ${i + 1} von ${slideCount}`}
                    aria-current={i === activeSlide}
                    className={`rounded-full border-0 p-0 transition-all ${
                      i === activeSlide ? 'w-5 h-1.5 bg-black' : 'w-1.5 h-1.5 bg-black/20 hover:bg-black/40'
                    }`}
                  />
                ))}
              </div>
            )}

            </div>
            </div>
          </div>

          {/* Die Ansichten als runde Bilder, rechts neben dem Schuh. */}
          {slideCount > 1 && (
            <div className="hidden lg:flex order-3 lg:col-span-1 flex-col items-center gap-4 pt-10">
              {gallery.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSlide(i); setZoomed(false); setIs3D(false) }}
                  aria-label={`Ansicht ${i + 1} von ${slideCount}`}
                  aria-current={i === activeSlide}
                  className={`w-16 h-16 rounded-full overflow-hidden bild-im-grund border-0 p-0 transition-shadow ${
                    i === activeSlide
                      ? 'shadow-[0_0_0_2px_var(--grund-angebot),0_0_0_3.5px_var(--tinte)]'
                      : 'shadow-[0_0_0_1px_rgba(35,28,23,0.12)] hover:shadow-[0_0_0_2px_var(--grund-angebot),0_0_0_3.5px_rgba(35,28,23,0.35)]'
                  }`}
                >
                  <img src={g} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Der Schritt ──────────────────────────────────────────────────
          Wie bei Nike By You: unter dem Schuh die Leiste mit dem Namen des
          Schritts, darunter seine Werte. Immer nur ein Schritt. */}
      <section
        id="konfig-wahl"
        className="px-4 lg:px-10 pt-4 lg:pt-5 pb-12 scroll-mt-16"
      >
        <div className="max-w-[1100px] mx-auto">
          <Schrittleiste
            schritt={schritt.titel}
            nummer={schrittNr + 1}
            anzahl={schritte.length}
            zurueckFrei={schrittNr > 0}
            weiterFrei={weiterFrei}
            onZurueck={zurueck}
            onWeiter={weiter}
            onMenue={() => setMenueOffen(true)}
          />

          <div className="mt-4 lg:mt-8">
            {schrittInhalt}
          </div>
        </div>
      </section>

      {/* ── Beschreibung und Bewertungen ─────────────────────────────── */}
      {/* Auf großen Bildschirmen steht das am Ende der Übersicht. */}
      <section className="g-erzaehlung px-4 lg:px-10 py-14 lg:py-20">
        {erzaehlung}
      </section>

      {/* ── Zusammenfassung ───────────────────────────────────────────────
          Wie beim Rolex-Konfigurator: Modell, was gewählt ist, Preis, und der
          eine Knopf, der jetzt dran ist. Bis zur Übersicht heißt er „Weiter",
          dort „In den Warenkorb" und „Jetzt kaufen". */}
      <div
        className="sticky bottom-0 z-20 g-angebot shadow-[0_-10px_40px_rgba(35,28,23,0.10)] px-4 lg:px-10 pt-3"
        style={{ paddingBottom: isNative ? 'max(env(safe-area-inset-bottom, 0px), 12px)' : '12px' }}
      >
        <div className="max-w-[1440px] mx-auto">
          <Zusammenfassung
            name={cleanShoeName(product.name)}
            zeilen={schritte.filter(x => x.wahl).map(x => (x.gruppe ? `${x.titel} ${x.wahl}` : x.wahl))}
            preis={displayPrice}
            preisVorher={totalDiscount > 0 ? formatPrice(priceBeforeDiscount) : null}
            hinweis={<Preishinweis className="mt-0.5" mitVersandlink />}
          >
            {kaufKnoepfe}
          </Zusammenfassung>
          {kaufHinweis}
        </div>
      </div>

      </>)}

      <SchrittMenue
        offen={menueOffen}
        schritte={schritte}
        aktuell={schritt.key}
        erreichbar={erreichbar}
        onSprung={geheZu}
        onClose={() => setMenueOffen(false)}
      />

      {/* ── Duplikat-Dialog ────────────────────────────────────── */}
      {/* Größentabelle. Als eigenes Fenster, damit sie von jeder Stelle der
          Seite aus erreichbar ist, ohne den Konfigurator zu verlassen. */}
      <GroessenTabelle
        offen={groessenOffen}
        onClose={() => setGroessenOffen(false)}
        lastKey={chosenLast || null}
        leisten={groessenLeisten}
        onUebernehmen={groesseUebernehmen}
      />

      {duplicateDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setDuplicateDialog(false)}>
          <div className="haus g-angebot mx-4 w-full max-w-md p-7" onClick={e => e.stopPropagation()}>
            <p className="t-klein c-leise mb-3">Warenkorb</p>
            <p className="t-text c-tinte mb-2">
              Dieser Schuh befindet sich bereits in deinem Warenkorb
            </p>
            <p className="t-klein c-leise mb-6">
              {product.name} in derselben Konfiguration liegt bereits im Warenkorb.
              Möchtest du nur das Zubehör hinzufügen oder den Schuh erneut?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDuplicateChoice(false)}
                className="t-klein flex-1 h-12 border border-black c-tinte bg-transparent hover:bg-black hover:text-white transition-all"
              >
                Nur Zubehör
              </button>
              <button
                onClick={() => handleDuplicateChoice(true)}
                className="t-klein flex-1 h-12 g-akzent border-0 hover:opacity-90 transition-opacity"
              >
                Schuh + Zubehör
              </button>
            </div>
            <button
              onClick={() => setDuplicateDialog(false)}
              className="t-klein w-full mt-3 h-9 c-leise hover:text-black/60 bg-transparent border-0 transition-all"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <CustomRequestModal
        open={customRequestOpen}
        onClose={() => setCustomRequestOpen(false)}
        product={product}
        config={{
          material: mat?.label || product.material,
          color:    col?.name || color,
          sole:     soleArt?.label,
          euSize:   chosenEU,
          footMeasurements: footMeasurementsUsed,
          scanId:   sizeType === 'custom' ? latestScan?.id : null,
          accessories: selectedAccessories.map(id => {
            const acc = accessories.find(a => a.id === id)
            return acc ? { id: acc.id, name: acc.name, price: acc.price } : null
          }).filter(Boolean),
        }}
      />
    </div>
    </div>
    </>
  )
}
