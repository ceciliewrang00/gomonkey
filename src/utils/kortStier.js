// KORT-STIER – tegner et stykke bane ud fra to punkter
//
// Hvert stykke bane på kortet er tre streger oven på hinanden:
//  1) st21: lys kant (bred)
//  2) st27: banens farve (KortView.vue giver den den rigtige farve ud fra banens id)
//  3) st8:  rebet – en tynd brun streg lidt over linjen, der hænger en smule ned
// Tallene er målt på de oprindelige streger i popup.json, så det ser ud som før.

// Rebet sidder så meget over linjen
const REB_LOEFT = 10.08
// Og hænger så meget ned på midten
const REB_HAENG = 3.92

// Runder til 2 decimaler, så stierne ikke bliver unødigt lange
const rund = (tal) => Math.round(tal * 100) / 100

// punkter = [[x0, y0], [x1, y1]] i kortets koordinater (samme som kort-base.svg)
export function lavStier(punkter) {
  const [[x0, y0], [x1, y1]] = punkter
  const dx = x1 - x0
  const dy = y1 - y0

  // Lige linje fra start til slut
  const lige = `M${rund(x0)},${rund(y0)}L${rund(x1)},${rund(y1)}`

  // Rebet: en blød kurve (C = to kontrolpunkter) løftet over linjen
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

// Laver en tom eller "hullet" Firebase-liste om til en almindelig liste.
// Firebase gemmer lister som objekter, hvis der mangler numre (fx efter en sletning)
export function somListe(data) {
  if (Array.isArray(data)) return data.filter((x) => x !== null && x !== undefined)
  if (data && typeof data === 'object') return Object.values(data)
  return []
}
