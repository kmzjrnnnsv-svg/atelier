/**
 * Bilderstrecke eines Zubehörartikels.
 *
 * Die Reihenfolge trägt die Bedeutung, genau wie bei den Modellen: Das erste
 * Bild steht in der Übersicht, das zweite erscheint beim Überfahren.
 *
 * Zubehör aus der Zeit vor der Strecke hat nur `image_data`. Daraus wird eine
 * Strecke mit einem Bild, damit alte Einträge nicht bildlos dastehen.
 */
export function accessoryImages(item) {
  let arr = []
  try { arr = JSON.parse(item?.images || '[]') } catch { arr = [] }
  if (!Array.isArray(arr)) arr = []
  if (!arr.length && item?.image_data) arr = [item.image_data]
  return arr.filter(Boolean)
}
