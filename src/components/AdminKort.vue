<script setup>
// Filen vises i AdminView.vue, når man klikker på fanen "Kort".

// Hent vores egen knap
import BaseButton from '@/components/BaseButton.vue'

// Værktøjer fra Vue:
//  ref         = en værdi, Vue holder øje med – ændrer den sig, opdateres siden af sig selv
//  computed    = en værdi, der regnes ud fra andre værdier og regnes ud igen, når de ændrer sig
//  onMounted   = kør noget, når fanen er vist på siden 
//  onUnmounted = kør noget, når fanen forsvinder igen 
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Adresserne i Firebase + hentToken, som giver os "adgangskortet", når vi er logget ind
import { KORTBANER_URL, KORTFILTER_URL, hentToken } from '@/services/api.js'

// Henter banerne (med navne) fra Firebase "baner"
import { hentBaner } from '@/services/baner.js'

// Henter banernes linjer fra Firebase "kortbaner"
import { hentKortbanerFraFirebase } from '@/services/kortApi.js'

// Laver to punkter om til de tre streger, en bane tegnes med (kant, farve, reb)
import { lavStier } from '@/utils/kortStier.js'


// Kort-tegningen (public/kort-base.svg) er 1683,78 bred og 1810,98 høj i sine egne enheder.
// Giver vi det ikke en størrelse, vil linjerne blive placeret forkert 
const KORT_BREDDE = 1683.78
const KORT_HOEJDE = 1810.98


// Slipper man et punkt tæt på et andet punkt, hopper det hen og sætter sig oven i det, så hænger linjerne sammen, selv om man ikke rammer helt præcist.
// 15 er i kortets enheder (samme som ovenfor), ikke pixels.
const SNAP_AFSTAND = 15

// Valgmulighederne i dropdown'en "Sværhedsgrad i kortfiltret"
const SVAERHED_VALG = ['For alle', 'Let', 'Mellem', 'Svær']

// ---------- Værdier, som siden viser ----------

// Alle baner på kortet. 
// Hver linje har et startpunkt og et slutpunkt
const kortbaner = ref([])

// Teksterne fra kortfiltret, i Firebase ligger de som en nummereret liste
const filterPoster = ref([])

// Banerne fra Firebase "baner".
// Vi bruger dem KUN til at vise banens rigtige navn, fx "Kaskaden" i stedet for "bane-3",
const faellesBaner = ref([])

// Til beskeder på siden:
// indlaeser  = true, mens data hentes 
const indlaeser = ref(true)
// fejlbesked = hvis data ikke kunne hentes
const fejlbesked = ref('')
// besked     = fx "Banen er gemt."
const besked = ref('')

// Den bane, man er ved at rette lige nu (null = man retter ikke noget).
const redigerer = ref(null)

// true, mens der gemmes (så knappen viser "Gemmer..." og ikke kan trykkes igen)
const gemmerRedigering = ref(false)

// Id på banen, der er ved at blive slettet, så knappen kan vise "Sletter..."
const sletterId = ref('')

// Formularen "Opret ny bane" nederst på siden
const nyBane = ref(tomNyBane())
const opretter = ref(false)    // true, mens den nye bane gemmes
const opretBesked = ref('')    // fx "Skriv et navn til banen."

// Giver en tom formular – bruges ved start og efter en bane er oprettet
function tomNyBane() {
  return { navn: '', undertekst: '', type: 'bane', svaerhed: 'Let', farve: '#CED0C0' }
}

// ---------- Hent data ----------

// Henter alt fra de tre steder i Firebase, når siden åbnes
async function hentAlt() {
  indlaeser.value = true
  fejlbesked.value = ''

  try {
    // Promise.all = hent alle tre på samme tid, og vent til de alle er færdige.
    // Fejler "baner", bruges bare en tom liste (.catch), så siden stadig virker
    const [geometri, filterSvar, baner] = await Promise.all([
      hentKortbanerFraFirebase(),
      fetch(`${KORTFILTER_URL}.json`).then((r) => {
        if (!r.ok) throw new Error(`Fejl ${r.status}`)
        return r.json()
      }),
      hentBaner().catch(() => [])
    ])

    //Gemmer de baner vi lige har hentet i en variabel. 
    faellesBaner.value = baner

    //Tager kortbaner, rydder dem op i hver enkelt, og gemmer dem i kortbaner.
    //geometri er listen af baner fra kortbaner, altså hvor banerne går på kortet. 
    // .map går listen igennem og kører tilRedigerbar funktionen, så vi ender med en ny liste med banerne
    kortbaner.value = geometri.map(tilRedigerbar)

    //Gemmer kortets teskter sammen med hver banes nummer og bruger et tomt array, hvis der ikke er nogen tekster i Firebase
    filterPoster.value = Object.entries(filterSvar ?? {})
      .filter(([, post]) => post)
      .map(([indeks, post]) => ({ indeks, ...post }))

  // Gik noget galt under hentningen, vises en fejlbesked på siden, og fejlen skrives i konsollen
  } catch (e) {
    fejlbesked.value = 'Kortets data kunne ikke hentes.'
    console.error(e)

  // finally kører altid til sidst – så "Henter kortet..." forsvinder, uanset om det gik godt
  } finally {
    indlaeser.value = false
  }
}

// Rydder op i en bane fra Firebase
function tilRedigerbar(bane) {
  //    bane.segmenter ?? {} = brug en tom liste, hvis banen ingen linjer har (fx Bounce)
  //    Object.values        = laver Firebase-objektet om til en almindelig liste
  const segmenter = Object.values(bane.segmenter ?? {}).map((seg) => ({
    // slot: linjens faste plads i kort-base.svg. Nye linjer fra admin har ingen (null)
    slot: seg.slot ?? null,
    // Kopiér hvert punkt til et NYT [x, y]. Så ændrer det ikke de originale data, når man trækker i punkterne i editoren
    punkter: seg.punkter.map(([x, y]) => [x, y])
  }))

  // 2. Den færdige bane. ?? = brug værdien til højre, hvis feltet mangler
  return {
    id: bane.id,
    type: bane.type ?? 'bane',
    navn: bane.navn ?? '',
    farve: bane.farve ?? '',
    segmenter
  }
}

// ---------- Små hjælpe-funktioner ----------

// Finder banen med dette id i "baner". Giver undefined, hvis den ikke findes
function faellesFor(id) {
  return faellesBaner.value.find((b) => b.id === id)
}

// Finder kortfilter-teksterne for banen med dette id
function filterFor(id) {
  return filterPoster.value.find((p) => p.id === id)
}

// Finder banens navn, uanset hvor det er gemt, og viser id'et, hvis der ikke er noget navn.
// Navnet ligger forskellige steder, alt efter om det er en fast bane eller en ny bane lavet i admin

function navnFor(bane) {
  return faellesFor(bane.id)?.name || bane.navn || filterFor(bane.id)?.titel || bane.id
}

// Banens farve. De faste baner har deres farve i _colors.scss.
// Nye baner har ikke den variabel, så de bruger deres egen farve
function farveFor(bane) {
  return `var(--kort-bane-${bane.id}, ${bane.farve || '#CED0C0'})`
}

// Vi samler de baner som ikke har samme id som den bane der redigeres i en liste med flatMap.
// Vi bruger computed, så listen regnes ud igen, hvis vi redigerer en anden bane.
const andreLinjer = computed(() =>
  kortbaner.value
    .filter((b) => b.id !== redigerer.value?.id)
    .flatMap((b) => b.segmenter.map((seg, i) => ({ noegle: `${b.id}-${i}`, punkter: seg.punkter })))
)

// Navne-skiltene på kortet. I kort-base.svg står de gamle navne ("Blå 1" osv.).
// Det interaktive kort (InteraktivtKort.vue) skjuler dem og skriver banens rigtige navn i stedet.
// Her tegner vi nye skilte oven på de gamle, så editoren ser ud som det rigtige kort.
// x og y = midten af skiltet i kort-base.svg (gruppen #Banner)
const SKILTE = [
  { id: 'bane-1', x: 1608.74, y: 1481.98 },
  { id: 'bane-2', x: 1551.66, y: 1348.32 },
  { id: 'bane-3', x: 1466.39, y: 1511.55 },
  { id: 'bane-4', x: 1142.5, y: 1606.91 },
  { id: 'bane-6', x: 623.98, y: 1633.38 },
  { id: 'bane-7', x: 803.05, y: 1282.63 },
  { id: 'bounce', x: 1308.46, y: 1232.49 },
  { id: 'bane-5', x: 1040.11, y: 1446.57 }
]

// Skiltene med navn og bredde. Bredden gættes ud fra antal bogstaver (ca. 17 pr. bogstav + luft),
// men er mindst 120, så det gamle skilt nedenunder bliver dækket helt
const skilte = computed(() =>
  SKILTE.map((s) => {
    const navn = navnFor({ id: s.id })
    return { ...s, navn, bredde: Math.max(120, navn.length * 17 + 36) }
  })
)

// ---------- Rediger en bane ----------

// Kører, når man trykker "Rediger bane". 
function startRedigering(bane) {
  // finder teksterne i kortfilteret 
  const post = filterFor(bane.id)
  // Fjerner beskeden, hvis man har rettet en anden bane før
  besked.value = ''
  //Vi laver en kopi af banen, som vi kan rette i.
  // Vi bruger tilRedigerbar, så vi får en ny liste med linjerne, som vi kan trække i uden at ændre de originale data.
  redigerer.value = {
    ...tilRedigerbar(bane),
    // navnet
    navn: bane.navn || post?.titel || '',
    // Underteksten til fileret
    undertekst: post?.undertekst ?? '',
    // Sværhedsgraden 
    svaerhed: post?.svaerhed ?? 'Let',
    // Farven
    farve: bane.farve || '#CED0C0',
    
    //retunere en true eller false alt efter om det er en ny bane eller en fast bane,
    // da det ikke er alle felter som vises ved faste baner.
    harFaelles: Boolean(faellesFor(bane.id))
  }
  aktivLinje.value = null // Fremhæver den linje man har valgt, men ingen linje er valgt endnu, så vi sætter den til null
  stopTegning() // Stopper med at tegne, hvis man var i gang med det
}

// "Annuller": smid kopien væk. Da det kun var en kopi, er intet ændret
function annullerRedigering() {
  redigerer.value = null 
  besked.value = ''
  stopTegning()
}

// ---------- Kort-editoren ----------

// Kortet i editoren
const editorSvg = ref(null)

// Nummeret på den linje, man har klikket på (null = ingen). Den kan så fjernes med "Fjern valgt linje"
const aktivLinje = ref(null)

//oversætter musens position på skærmen til en position på kortet.
function tilKort(event) {
  // Find editorens SVG
  const svg = [editorSvg.value].flat()[0]
  // Laver et punkt og giv det musens position på skærmen (clientX, clientY)
  const pt = svg.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  //Her oversættes det, så det passer til kortets koordinater. 
  //.getScreenCTM() er opskriften fra kortet til skærmen 
  //.inverse() vender opskriften om, så den gør fra skærm til kort 
  //matrixTransform() bruger opskriften på punktet.
  const p = pt.matrixTransform(svg.getScreenCTM().inverse())
  // Vi vil ikke have punkter uden for kortet, så vi tvinger dem ind i kortets grænser
  return [Math.min(Math.max(p.x, 0), KORT_BREDDE), Math.min(Math.max(p.y, 0), KORT_HOEJDE)]
}

// Spørger: ligger punkt a og punkt b (næsten) samme sted? Giver true eller false.
// a og b er punkter som [x, y], fx [100, 200].
//
// Sådan regnes afstanden ud (Pythagoras – som i matematik: a² + b² = c²):
//   a[0] - b[0] = hvor langt de er fra hinanden vandret
//   a[1] - b[1] = hvor langt de er fra hinanden lodret
//   Math.hypot(...) = den skrå afstand lige imellem dem
// Eksempel: [100, 200] og [103, 204] → vandret 3, lodret 4 → afstand 5
//
// afstand = hvor tæt de skal være for at tælle som "samme sted".
// Skriver man ingen afstand, bruges 0.5 – altså reelt præcis samme punkt
// (0.5 i stedet for 0, fordi punkterne rundes af og kan være en lille smule forskellige).
// Magneten giver i stedet SNAP_AFSTAND (15) med, så "tæt på" tæller
function sammePunkt(a, b, afstand = 0.5) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) <= afstand
}

// En lang liste med ALLE punkter på kortet – fra alle baner, også den man retter.
// Bruges til "magneten": et nyt punkt kan sætte sig fast i et hvilket som helst af dem
function allePunkter() {
  return [
    ...kortbaner.value.filter((b) => b.id !== redigerer.value.id).flatMap((b) => b.segmenter),
    ...redigerer.value.segmenter
  ].flatMap((seg) => seg.punkter)
}

// "MAGNETEN". Ligger der et andet punkt tæt på (inden for SNAP_AFSTAND), bruges det punkt i stedet.
// Ellers bruges punktet, som det er (rundet af til 2 decimaler).
// undtagen = punkter, der ikke må tælle med – fx det punkt, man selv trækker i,
// ellers ville det bare sætte sig fast i sig selv
function fastgoer(punkt, undtagen = []) {
  const naer = allePunkter().find((p) => !undtagen.includes(p) && sammePunkt(p, punkt, SNAP_AFSTAND))
  return naer ? [naer[0], naer[1]] : [Math.round(punkt[0] * 100) / 100, Math.round(punkt[1] * 100) / 100]
}

// "Fjern valgt linje": tager linjen ud af listen (splice fjerner 1 ting på den plads)
function fjernAktivLinje() {
  redigerer.value.segmenter.splice(aktivLinje.value, 1)
  aktivLinje.value = null
}

// ---------- Tegn nye linjer ----------
// Sådan tegner man: tryk "Tegn linjer", og klik på kortet fra platform til platform.
// Første klik = startpunkt. Hvert klik derefter laver en linje fra det forrige punkt
// til det nye. Så bliver banen en kæde af linjer: A→B, B→C, C→D ...

// true, mens man tegner
const tegner = ref(false)

// Punktet, den næste linje starter i (null = første klik er ikke sket endnu)
const tegnStart = ref(null)

// Hvor musen er lige nu – til den stiplede linje, der viser, hvor næste linje kommer
const musPunkt = ref(null)

// "Tegn linjer"
function startTegning() {
  tegner.value = true
  tegnStart.value = null
  aktivLinje.value = null
}

// "Færdig" (eller Esc) – stop med at tegne og nulstil
function stopTegning() {
  tegner.value = false
  tegnStart.value = null
  musPunkt.value = null
}

// "Start et nyt sted": glem det sidste punkt, så næste klik bliver et nyt startpunkt.
// Bruges, hvis banen deler sig, eller man vil tegne et andet stykke
function nyStart() {
  tegnStart.value = null
}

// Kører ved hvert klik på kortet – men gør kun noget, mens man tegner
function klikPaaKort(event) {
  if (!tegner.value) return

  // Hvor på kortet blev der klikket? (og sæt det fast i et punkt i nærheden)
  const punkt = fastgoer(tilKort(event))

  // Har vi et startpunkt, laves en ny linje fra det til klikket.
  // (Ikke hvis man klikker samme sted to gange – så ville linjen have længden 0)
  if (tegnStart.value && !sammePunkt(tegnStart.value, punkt)) {
    redigerer.value.segmenter.push({ slot: null, punkter: [tegnStart.value, punkt] })
  }
  // Næste linje starter, hvor denne sluttede
  tegnStart.value = [punkt[0], punkt[1]]
}

// "Fortryd sidste linje": fjerner den sidste linje (pop = tag den sidste ud af listen).
// Er man i gang med at tegne, fortsætter man fra der, hvor den fjernede linje startede
function fortrydLinje() {
  const sidste = redigerer.value.segmenter.pop()
  if (tegner.value && sidste) tegnStart.value = [...sidste.punkter[0]]
  aktivLinje.value = null
}

// Tryk Esc for at stoppe med at tegne (lytteren sættes på i onMounted nederst)
function tastatur(event) {
  if (event.key === 'Escape' && tegner.value) stopTegning()
}

// ---------- Træk i punkter ----------
// Når man ikke tegner, kan man flytte banen ved at trække i de hvide prikker.
// grib = man trykker på en prik, flyt = man trækker, slip = man giver slip

// De punkter, man trækker i lige nu. Det kan være flere på én gang:
// hvor to linjer mødes (fx ved en platform), ligger der to punkter oven i hinanden.
// De skal flytte sig sammen, ellers ville linjerne blive revet fra hinanden
let trukne = []

// Man trykker på en prik. linje = hvilken linje, ende = 0 (start) eller 1 (slut)
function grib(linje, ende, event) {
  // Mens man tegner, skal et klik på en prik bare tælle som et klik på kortet
  if (tegner.value) return
  event.preventDefault()

  // Punktet, man trykkede på – og alle andre punkter, der ligger præcis samme sted
  const greb = redigerer.value.segmenter[linje].punkter[ende]
  trukne = redigerer.value.segmenter.flatMap((seg) => seg.punkter.filter((p) => sammePunkt(p, greb)))
  aktivLinje.value = linje
  // "Hold fast i musen": prikken bliver ved med at følge musen,
  // selv hvis man trækker hurtigt, og musen kommer uden for prikken
  event.target.setPointerCapture(event.pointerId)
}

// Musen bevæger sig over kortet.
// Mens man tegner: husk hvor musen er (til den stiplede linje).
// Mens man trækker i en prik: flyt prikken (og dem oven i den) hen til musen
function flyt(event) {
  if (tegner.value) {
    musPunkt.value = tilKort(event)
    return
  }
  if (trukne.length === 0) return
  const [x, y] = tilKort(event)
  for (const p of trukne) {
    p[0] = x
    p[1] = y
  }
}

// Man giver slip. Er der et andet punkt tæt på (også på andre baner), hopper prikken
// hen og sætter sig fast i det ("magneten"). Derefter trækker man ikke i noget længere
function slip() {
  if (trukne.length === 0) return
  const [x, y] = fastgoer(trukne[0], trukne)
  for (const p of trukne) {
    p[0] = x
    p[1] = y
  }
  trukne = []
}

// ---------- Gem ----------

// Laver den bane, der skal gemmes i Firebase "kortbaner".
// Vi gemmer kun punkterne (rundet af til 2 decimaler) – selve stregerne regner kortet ud,
// når det vises. "slot" er med, hvis linjen hører til en fast plads i kort-base.svg
function kortbaneTilGem(r) {
  const data = {
    id: r.id,
    type: r.type,
    segmenter: r.segmenter.map((seg) => ({
      ...(seg.slot ? { slot: seg.slot } : {}),
      punkter: seg.punkter.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])
    }))
  }
  // Navn og farve gemmes kun for NYE baner.
  // De faste baner har deres navn under fanen "Baner" og deres farve i _colors.scss
  if (!r.harFaelles) {
    data.navn = r.navn.trim()
    data.farve = r.farve
  }
  return data
}

// Sender data til Firebase. Bruges af både gem og opret.
// token = beviset på, at man er logget ind – uden det afviser Firebase at gemme.
// metode: 'PUT' = erstat det hele, 'PATCH' = ret kun de felter, vi sender med
async function skrivFirebase(url, metode, data) {
  const token = await hentToken()
  const res = await fetch(`${url}.json?auth=${encodeURIComponent(token)}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(`Fejl ${res.status}`)
}

// Gemmer banens tekster i kortfiltret (Firebase "mapfilter").
// To situationer:
//  - Banen findes allerede i listen → ret den på dens plads (PATCH til fx mapfilter/2)
//  - Banen findes ikke (en ny bane) → find det højeste nummer i listen, og læg den på
//    nummeret efter (fx 7 → 8). Så kommer den sidst i listen
async function gemFilter(id, felter) {
  const post = filterFor(id)
  if (post) {
    await skrivFirebase(`${KORTFILTER_URL}/${post.indeks}`, 'PATCH', felter)
    Object.assign(post, felter)
  } else {
    const indeks = String(Math.max(-1, ...filterPoster.value.map((p) => Number(p.indeks))) + 1)
    await skrivFirebase(`${KORTFILTER_URL}/${indeks}`, 'PUT', { id, ...felter })
    filterPoster.value.push({ indeks, id, ...felter })
  }
}

// Tjekker, om det man har skrevet, er en rigtig farvekode (hex), fx "#b8433f" eller "#b43".
// Har man glemt # foran, sætter vi den på.
// Er koden god, gives den tilbage med små bogstaver. Er den ikke god, gives null.
// Selve tjekket er et regex: # efterfulgt af præcis 3 eller 6 tegn fra 0-9 og a-f
function rensFarve(tekst) {
  const kode = String(tekst ?? '').trim()
  const medHaven = kode.startsWith('#') ? kode : '#' + kode
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(medHaven) ? medHaven.toLowerCase() : null
}

// Fejlbeskeden ved en forkert farve (bruges to steder, så den står her én gang)
const FARVE_FEJL = 'Skriv farven som en hex-kode, fx #b8433f.'

// "Gem ændringer": tjek formularen, og gem så banen i Firebase
async function gemRedigering() {
  const r = redigerer.value
  besked.value = ''

  // TJEK FØRST: nye baner skal have et navn og en gyldig farve.
  // (Faste baner har deres navn og farve andre steder, så dem tjekker vi ikke)
  if (!r.harFaelles && !r.navn.trim()) {
    besked.value = 'Banen skal have et navn.'
    return
  }

  if (!r.harFaelles) {
    const farve = rensFarve(r.farve)
    if (!farve) {
      besked.value = FARVE_FEJL
      return
    }
    r.farve = farve
  }

  gemmerRedigering.value = true
  try {
    const data = kortbaneTilGem(r)

    // 1) Gem linjerne i "kortbaner".
    // PUT erstatter HELE banen. Det er vigtigt: har man fjernet en linje,
    // forsvinder den også i Firebase (med PATCH ville den gamle blive liggende)
    await skrivFirebase(`${KORTBANER_URL}/${encodeURIComponent(r.id)}`, 'PUT', data)

    // 2) Gem teksterne i kortfiltret. Undertekst altid – titel og sværhedsgrad kun for nye baner
    const filterFelter = { undertekst: r.undertekst.trim() }
    if (!r.harFaelles) {
      filterFelter.titel = r.navn.trim()
      filterFelter.svaerhed = r.svaerhed
    }
    await gemFilter(r.id, filterFelter)

    // 3) Opdatér listen på siden, så den viser det, vi lige har gemt (uden at hente alt igen)
    const indeks = kortbaner.value.findIndex((b) => b.id === r.id)
    kortbaner.value[indeks] = tilRedigerbar(data)

    redigerer.value = null
    besked.value = 'Banen er gemt. Kortet viser ændringen, næste gang det åbnes.'
  } catch (e) {
    besked.value = 'Banen kunne ikke gemmes. Prøv igen.'
    console.error(e)
  } finally {
    gemmerRedigering.value = false
  }
}

// ---------- Slet bane ----------

// "Slet bane": fjerner banen fra kortet ("kortbaner") og fra kortfiltret ("mapfilter").
// Er det en fast bane, ligger den også under fanen "Baner" – den del bliver IKKE slettet
async function sletBane(bane) {
  besked.value = ''

  // Spørg først, om man er sikker (window.confirm viser en boks med OK/Annuller).
  // Trykker man Annuller, stopper vi her
  const navn = navnFor(bane)
  const advarsel = faellesFor(bane.id)
    ? `Vil du slette "${navn}" fra kortet og kortfiltret?\n\nTeksterne under fanen "Baner" bliver liggende.`
    : `Vil du slette "${navn}" fra kortet og kortfiltret?`
  if (!window.confirm(advarsel)) return

  sletterId.value = bane.id
  try {
    // En lille funktion, der sletter det, der ligger på en adresse i Firebase
    const token = await hentToken()
    const slet = async (url) => {
      const res = await fetch(`${url}.json?auth=${encodeURIComponent(token)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Fejl ${res.status}`)
    }

    // 1) Slet banens linjer
    await slet(`${KORTBANER_URL}/${encodeURIComponent(bane.id)}`)

    // 2) Slet banens tekster i kortfiltret (på dens nummer, fx mapfilter/2).
    // Pladsen bliver bare tom – de andre baner beholder deres numre,
    // og kortfiltret springer tomme pladser over
    const post = filterFor(bane.id)
    if (post) {
      await slet(`${KORTFILTER_URL}/${post.indeks}`)
      filterPoster.value = filterPoster.value.filter((p) => p !== post)
    }

    // 3) Fjern banen fra listen på siden (og luk redigeringen, hvis den var åben)
    kortbaner.value = kortbaner.value.filter((b) => b.id !== bane.id)
    if (redigerer.value?.id === bane.id) redigerer.value = null

    besked.value = `"${navn}" er slettet.`
  } catch (e) {
    besked.value = 'Banen kunne ikke slettes. Prøv igen.'
    console.error(e)
  } finally {
    sletterId.value = ''
  }
}

// ---------- Opret bane ----------

// Finder på et id til en ny bane. Vi kigger på alle id'er som "bane-7", tager tallet ud,
// finder det højeste og lægger 1 til. Er højeste bane-7, bliver den nye bane-8.
// (Id'er uden tal, fx "bounce", springes over)
function nytId() {
  const numre = kortbaner.value
    .map((b) => Number(b.id.match(/^bane-(\d+)$/)?.[1]))
    .filter((n) => !Number.isNaN(n))
  return `bane-${Math.max(0, ...numre) + 1}`
}

// "Opret bane": tjek formularen, gem den nye bane (uden linjer endnu) og åbn den,
// så man kan tegne dens linjer med det samme
async function opretBane() {
  opretBesked.value = ''
  const ny = nyBane.value

  // Tjek: navn og gyldig farve

  if (!ny.navn.trim()) {
    opretBesked.value = 'Skriv et navn til banen.'
    return
  }

  const farve = rensFarve(ny.farve)
  if (!farve) {
    opretBesked.value = FARVE_FEJL
    return
  }
  ny.farve = farve

  opretter.value = true
  try {
    // Gem banen i "kortbaner" (med en tom liste af linjer) og dens tekster i kortfiltret
    const id = nytId()
    const data = kortbaneTilGem({ ...ny, id, segmenter: [], harFaelles: false })
    await skrivFirebase(`${KORTBANER_URL}/${id}`, 'PUT', data)
    await gemFilter(id, { titel: ny.navn.trim(), undertekst: ny.undertekst.trim(), svaerhed: ny.svaerhed })

    // Vis den nye bane i listen, og tøm formularen
    const bane = tilRedigerbar(data)
    kortbaner.value.push(bane)
    nyBane.value = tomNyBane()
    opretBesked.value = 'Banen er oprettet. Tegn dens linjer på kortet ovenfor.'

    // Åbner den nye bane, så man kan tegne linjerne med det samme
    if (bane.type === 'bane') startRedigering(bane)
  } catch (e) {
    opretBesked.value = 'Banen kunne ikke oprettes. Prøv igen.'
    console.error(e)
  } finally {
    opretter.value = false
  }
}

// Når fanen åbnes: hent data, og begynd at lytte efter Esc-tasten
onMounted(() => {
  hentAlt()
  window.addEventListener('keydown', tastatur)
})

// Når fanen lukkes: stop med at lytte efter tasten igen
onUnmounted(() => {
  window.removeEventListener('keydown', tastatur)
})
</script>

<template>
  <h2>Rediger kort og kortfilter</h2>

  <p v-if="besked" role="status">{{ besked }}</p>

  <!-- v-if / v-else-if / v-else: kun én af dem vises ad gangen -->
  <p v-if="indlaeser">Henter kortet...</p>
  <p v-else-if="fejlbesked">{{ fejlbesked }}</p>
  <p v-else-if="kortbaner.length === 0">Der er ingen baner på kortet endnu.</p>

  <div v-else class="admin-liste">
    <!-- Ét kort pr. bane -->
    <article v-for="bane in kortbaner" :key="bane.id" class="admin-kort">
      <h3>
        <span class="farve-prik" :style="{ background: farveFor(bane) }" aria-hidden="true"></span>
        {{ navnFor(bane) }}
      </h3>

      <p>Type: {{ bane.type }} · Linjer: {{ bane.segmenter.length }}</p>
      <p v-if="filterFor(bane.id)?.undertekst">Kortfilter: {{ filterFor(bane.id).undertekst }}</p>

      <div class="knapper">
        <BaseButton type="button" variant="primary" @click="startRedigering(bane)">
          Rediger bane
        </BaseButton>
      </div>

      <!-- Vises kun på den bane, der redigeres -->
      <section v-if="redigerer?.id === bane.id" class="redigering">
        <h3>Rediger {{ navnFor(bane) }}</h3>

        <!-- Navn og sværhedsgrad: faste baner retter man under fanen "Baner" -->
        <template v-if="!redigerer.harFaelles">
          <label :for="'kort-navn-' + bane.id">Navn</label>
          <input :id="'kort-navn-' + bane.id" v-model="redigerer.navn" type="text" required />

          <label :for="'kort-svaerhed-' + bane.id">Sværhedsgrad i kortfiltret</label>
          <select :id="'kort-svaerhed-' + bane.id" v-model="redigerer.svaerhed">
            <option v-for="s in SVAERHED_VALG" :key="s" :value="s">{{ s }}</option>
          </select>

          <label :for="'kort-farve-' + bane.id">Farve på kortet (hex-kode, fx #b8433f)</label>
          <div class="farve-raekke">
            <input
              :id="'kort-farve-' + bane.id"
              v-model="redigerer.farve"
              type="text"
              placeholder="#b8433f"
              class="farve-felt"
            />
            <!-- Viser farven, så snart koden er gyldig -->
            <span
              class="farve-prik farve-proeve"
              :style="{ background: rensFarve(redigerer.farve) ?? 'transparent' }"
              aria-hidden="true"
            ></span>
          </div>
        </template>
        <p v-else>Navn og sværhedsgrad rettes under fanen "Baner".</p>

        <label :for="'kort-undertekst-' + bane.id">Undertekst i kortfiltret (fx "Tarzan spring")</label>
        <input :id="'kort-undertekst-' + bane.id" v-model="redigerer.undertekst" type="text" />

        <label :for="'kort-type-' + bane.id">Type</label>
        <select :id="'kort-type-' + bane.id" v-model="redigerer.type">
          <option value="bane">Bane (har linjer på kortet)</option>
          <option value="aktivitet">Aktivitet (ingen linjer, fx Bounce)</option>
        </select>

        <!-- Kort-editoren. Alt rettes ved at klikke og trække på kortet -->
        <template v-if="redigerer.type === 'bane'">
          <!-- Hjælpeteksten skifter, så den passer til det, man er i gang med -->
          <p class="hjaelp" role="status">
            <template v-if="tegner && !tegnStart">
              Klik på kortet, hvor linjen skal starte. Klik tæt på et punkt for at fortsætte derfra.
            </template>
            <template v-else-if="tegner">
              Klik, hvor linjen skal slutte. Bliv ved med at klikke for at tegne videre. Tryk Esc eller "Færdig", når du er færdig.
            </template>
            <template v-else>
              Træk i de hvide punkter for at flytte banen. Klik på en linje for at vælge den.
            </template>
          </p>

          <!-- Værktøjer over kortet -->
          <div class="knapper editor-knapper">
            <template v-if="!tegner">
              <BaseButton type="button" variant="primary" @click="startTegning">Tegn linjer</BaseButton>
              <BaseButton
                v-if="aktivLinje !== null"
                type="button"
                variant="secondary"
                @click="fjernAktivLinje"
              >
                Fjern valgt linje
              </BaseButton>
            </template>
            <template v-else>
              <BaseButton type="button" variant="primary" @click="stopTegning">Færdig</BaseButton>
              <BaseButton v-if="tegnStart" type="button" variant="secondary" @click="nyStart">
                Start et nyt sted
              </BaseButton>
              <BaseButton
                v-if="redigerer.segmenter.length"
                type="button"
                variant="secondary"
                @click="fortrydLinje"
              >
                Fortryd sidste linje
              </BaseButton>
            </template>
          </div>

          <svg
            ref="editorSvg"
            class="kort-editor"
            :class="{ 'tegner': tegner }"
            :viewBox="`0 0 ${KORT_BREDDE} ${KORT_HOEJDE}`"
            role="img"
            :aria-label="'Kort med ' + navnFor(bane) + 's linjer'"
            @click="klikPaaKort"
            @pointermove="flyt"
            @pointerup="slip"
            @pointercancel="slip"
            @pointerleave="musPunkt = null"
          >
            <image href="/kort-base.svg" x="0" y="0" :width="KORT_BREDDE" :height="KORT_HOEJDE" />

            <!-- De andre baners linjer, svagt -->
            <line
              v-for="l in andreLinjer"
              :key="l.noegle"
              class="anden-linje"
              :x1="l.punkter[0][0]"
              :y1="l.punkter[0][1]"
              :x2="l.punkter[1][0]"
              :y2="l.punkter[1][1]"
            />

            <!-- Denne banes linjer, tegnet som på det rigtige kort. Klik for at vælge en -->
            <g
              v-for="(seg, i) in redigerer.segmenter"
              :key="'seg-' + i"
              class="linje"
              :class="{ 'er-aktiv': aktivLinje === i }"
              @click="!tegner && (aktivLinje = aktivLinje === i ? null : i)"
            >
              <path class="kant" :d="lavStier(seg.punkter)[0].d" />
              <path class="farve" :d="lavStier(seg.punkter)[1].d" :style="{ stroke: farveFor(redigerer) }" />
              <path class="reb" :d="lavStier(seg.punkter)[2].d" />
              <!-- Usynlig, bred streg, så linjen er nem at ramme -->
              <path class="klikflade" :d="lavStier(seg.punkter)[1].d" />
            </g>

            <!-- Navne-skilte i banens farve – som på det interaktive kort -->
            <g v-for="s in skilte" :key="'skilt-' + s.id" class="skilt">
              <rect
                :x="s.x - s.bredde / 2"
                :y="s.y - 26"
                :width="s.bredde"
                height="52"
                rx="26"
                :style="{ fill: `var(--kort-bane-${s.id})` }"
              />
              <text :x="s.x" :y="s.y">{{ s.navn }}</text>
            </g>

            <!-- Stiplet linje fra sidste punkt til musen, mens man tegner -->
            <line
              v-if="tegner && tegnStart && musPunkt"
              class="forhaandsvisning"
              :x1="tegnStart[0]"
              :y1="tegnStart[1]"
              :x2="musPunkt[0]"
              :y2="musPunkt[1]"
              :style="{ stroke: farveFor(redigerer) }"
            />

            <!-- Punkterne, man kan trække i -->
            <template v-for="(seg, i) in redigerer.segmenter" :key="'punkter-' + i">
              <circle
                v-for="(p, ende) in seg.punkter"
                :key="ende"
                class="haandtag"
                :class="{ 'er-aktiv': aktivLinje === i }"
                :cx="p[0]"
                :cy="p[1]"
                r="14"
                @pointerdown="grib(i, ende, $event)"
              />
            </template>

            <!-- Startpunktet for næste linje -->
            <circle
              v-if="tegner && tegnStart"
              class="tegn-start"
              :cx="tegnStart[0]"
              :cy="tegnStart[1]"
              r="18"
            />
          </svg>
        </template>

        <div class="knapper">
          <BaseButton type="button" variant="secondary" @click="annullerRedigering">Annuller</BaseButton>
          <BaseButton type="button" variant="primary" :disabled="gemmerRedigering" @click="gemRedigering">
            {{ gemmerRedigering ? 'Gemmer...' : 'Gem ændringer' }}
          </BaseButton>
        </div>

        <!-- Slet ligger inde i redigeringen, så man ikke kommer til at trykke på den ved en fejl -->
        <div class="knapper">
          <BaseButton
            type="button"
            variant="secondary"
            :disabled="sletterId !== '' || gemmerRedigering"
            @click="sletBane(bane)"
          >
            {{ sletterId === bane.id ? 'Sletter...' : 'Slet bane' }}
          </BaseButton>
        </div>
      </section>
    </article>
  </div>

  <!-- Opret bane (under listen, ligesom i quiz) -->
  <section v-if="!indlaeser && !fejlbesked" class="admin-kort">
    <h2>Opret bane</h2>

    <label for="ny-kortbane-navn">Navn</label>
    <input id="ny-kortbane-navn" v-model="nyBane.navn" type="text" required />

    <label for="ny-kortbane-undertekst">Undertekst i kortfiltret (valgfri)</label>
    <input id="ny-kortbane-undertekst" v-model="nyBane.undertekst" type="text" />

    <label for="ny-kortbane-type">Type</label>
    <select id="ny-kortbane-type" v-model="nyBane.type">
      <option value="bane">Bane (har linjer på kortet)</option>
      <option value="aktivitet">Aktivitet (ingen linjer, fx Bounce)</option>
    </select>

    <label for="ny-kortbane-svaerhed">Sværhedsgrad i kortfiltret</label>
    <select id="ny-kortbane-svaerhed" v-model="nyBane.svaerhed">
      <option v-for="s in SVAERHED_VALG" :key="s" :value="s">{{ s }}</option>
    </select>

    <label for="ny-kortbane-farve">Farve på kortet (hex-kode, fx #b8433f)</label>
    <div class="farve-raekke">
      <input
        id="ny-kortbane-farve"
        v-model="nyBane.farve"
        type="text"
        placeholder="#b8433f"
        class="farve-felt"
      />
      <!-- Viser farven, så snart koden er gyldig -->
      <span
        class="farve-prik farve-proeve"
        :style="{ background: rensFarve(nyBane.farve) ?? 'transparent' }"
        aria-hidden="true"
      ></span>
    </div>

    <div class="knapper">
      <BaseButton type="button" variant="primary" :disabled="opretter" @click="opretBane">
        {{ opretter ? 'Opretter...' : 'Opret bane' }}
      </BaseButton>
    </div>

    <p v-if="opretBesked" role="status">{{ opretBesked }}</p>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;

// Banefarverne fra $kort-bane-farver – samme som på kortet, så editoren viser de rigtige farver
.admin-liste {
  @each $id, $farve in c.$kort-bane-farver {
    --kort-bane-#{$id}: #{$farve};
  }
}

h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.farve-prik {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.hjaelp {
  margin-top: 1rem;
}

// Kortet fylder kortets bredde og bevarer formatet
.kort-editor {
  display: block;
  width: 100%;
  max-width: 40rem;
  height: auto;
  margin-top: 1rem;
  border-radius: 1rem;
  background-color: c.$forest_green25;
  // Så man kan trække med fingeren uden at siden scroller
  touch-action: none;
  user-select: none;
}

// De tre streger – samme tykkelser og farver som i kort-base.svg
.kant {
  fill: none;
  stroke: #f6edda;
  stroke-width: 15px;
  stroke-linecap: round;
}

.farve {
  fill: none;
  stroke-width: 10px;
  stroke-linecap: round;
}

.reb {
  fill: none;
  stroke: #7b6d4b;
  stroke-width: 1.3px;
}

.er-aktiv .farve {
  stroke-width: 16px;
}

// Skiltene skal ikke kunne klikkes på – klik går igennem til kortet.
// Teksten har samme skrift og farve som på det interaktive kort
.skilt {
  pointer-events: none;

  text {
    font-family: 'Montserrat', sans-serif;
    font-size: 26px;
    font-weight: 800;
    fill: c.$primary_light25;
    text-anchor: middle;
    dominant-baseline: central;
  }
}

.anden-linje {
  stroke: c.$primary_black100;
  stroke-width: 6px;
  stroke-linecap: round;
  opacity: 0.25;
}

.haandtag {
  fill: white;
  stroke: c.$primary_black100;
  stroke-width: 3px;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  &.er-aktiv {
    stroke: c.$secondary_purple100;
    stroke-width: 5px;
  }
}

// Under tegning er markøren et sigtekorn
.kort-editor.tegner {
  cursor: crosshair;
}

.linje {
  cursor: pointer;
}

.tegner .linje,
.tegner .haandtag {
  cursor: crosshair;
}

// Gør linjerne nemme at ramme uden at gøre dem tykkere
.klikflade {
  fill: none;
  stroke: transparent;
  stroke-width: 30px;
  stroke-linecap: round;
}

.forhaandsvisning {
  stroke-width: 8px;
  stroke-dasharray: 16 12;
  stroke-linecap: round;
  opacity: 0.8;
  pointer-events: none;
}

.tegn-start {
  fill: none;
  stroke: c.$secondary_purple100;
  stroke-width: 5px;
  pointer-events: none;
}

.editor-knapper {
  margin-top: 0.5rem;
}

// Hex-feltet med en prik ved siden af, der viser farven
.farve-raekke {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

// Feltet skal ikke være lige så bredt som tekstfelterne
.farve-felt {
  max-width: 10rem;
}

.farve-proeve {
  width: 2rem;
  height: 2rem;
  border: 2px solid c.$primary_black100;
}
</style>
