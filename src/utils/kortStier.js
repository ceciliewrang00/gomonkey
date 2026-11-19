// Laver to punkter om til de tre streger, en bane tegnes med: kant (st21), farve (st27) og reb (st8).
// Klassenavnene er de samme som i kort-base.svg, så det ser ens ud

// Så højt over linjen sidder rebet, og så meget hænger det ned på midten
const REB_LOEFT = 10.08
const REB_HAENG = 3.92

// Runder et tal til 2 decimaler
const rund = (tal) => Math.round(tal * 100) / 100

// Får start- og slutpunktet og giver de tre streger tilbage.
// "d" beskriver stregen: M = start her, L = lige streg hertil, C = blød kurve
export function lavStier(punkter) {
  const [[x0, y0], [x1, y1]] = punkter
  const dx = x1 - x0
  const dy = y1 - y0

  // Kant og farve er en lige streg fra start til slut
  const lige = `M${rund(x0)},${rund(y0)}L${rund(x1)},${rund(y1)}`

  // Rebet er en blød kurve lidt over linjen, som hænger en smule ned på midten
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

// Laver data fra Firebase om til en liste uden tomme pladser.
// Firebase gemmer nogle gange en liste som et objekt, fx når noget er slettet
export function somListe(data) {
  if (Array.isArray(data)) return data.filter((x) => x !== null && x !== undefined)
  if (data && typeof data === 'object') return Object.values(data)
  return []
}
