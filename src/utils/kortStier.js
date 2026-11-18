// KORT-STIER – laver to punkter om til de streger, en bane tegnes med
//
// Et stykke bane på kortet er tre streger lagt oven på hinanden:
//  1) st21: en bred, lys kant
//  2) st27: banens farve (den rigtige farve sættes ud fra banens id)
//  3) st8:  rebet – en tynd brun streg lidt over linjen, der hænger en smule ned på midten
// st21, st27 og st8 er klassenavnene fra kort-tegningen (kort-base.svg), så de ser ens ud.
// Tallene herunder er målt på de gamle streger i popup.json, så det ser ud som før.

// Så højt over linjen sidder rebet
const REB_LOEFT = 10.08
// Så meget hænger rebet ned på midten
const REB_HAENG = 3.92

// Runder et tal til 2 decimaler (fx 12.3456 → 12.35), så teksten ikke bliver unødigt lang
const rund = (tal) => Math.round(tal * 100) / 100

// Får to punkter: [[x0, y0], [x1, y1]] (start og slut i kortets enheder).
// Giver de tre streger tilbage. "d" er SVG's måde at beskrive en streg på:
//   M x,y = start her    L x,y = tegn en lige streg hertil    C ... = tegn en blød kurve
export function lavStier(punkter) {
  const [[x0, y0], [x1, y1]] = punkter
  const dx = x1 - x0 // hvor langt linjen går til siden
  const dy = y1 - y0 // hvor langt linjen går op/ned

  // Kant og farve: en lige streg fra start til slut
  const lige = `M${rund(x0)},${rund(y0)}L${rund(x1)},${rund(y1)}`

  // Rebet: en blød kurve, løftet lidt over linjen.
  // En C-kurve har to "trækpunkter" (her ved 1/3 og 2/3 af vejen), som er trukket lidt ned,
  // så rebet ser ud til at hænge
  const sy = y0 - REB_LOEFT
  const reb =
    `M${rund(x0)},${rund(sy)}` +
    `C${rund(x0 + dx / 3)},${rund(sy + dy / 3 + REB_HAENG)} ` +
    `${rund(x0 + (2 * dx) / 3)},${rund(sy + (2 * dy) / 3 + REB_HAENG)} ` +
    `${rund(x1)},${rund(y1 - REB_LOEFT)}`

  return [
    { class: 'st21', d: lige },
    { class: 'st27', d: lige },
    { class: 'st8', d: reb }
  ]
}

// Laver data fra Firebase om til en almindelig liste.
// Firebase gemmer nemlig nogle gange en liste som et objekt { 0: ..., 2: ... },
// fx når et nummer mangler, fordi noget er slettet. Tomme pladser (null) fjernes.
// Er der slet ingen data, gives en tom liste
export function somListe(data) {
  if (Array.isArray(data)) return data.filter((x) => x !== null && x !== undefined)
  if (data && typeof data === 'object') return Object.values(data)
  return []
}
