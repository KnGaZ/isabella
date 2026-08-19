// Orden de presentación aprobado en el diseño original (CapturaRapida.jsx).
// Los catálogos siguen viviendo en Supabase; esto solo decide el orden en
// pantalla mientras no exista una columna sort_order editable desde el panel admin.
const CAJA_ORDER = ["CAJA_HOTEL", "RESTAURANTE", "PONTON", "JET_SKI", "BORREGOS"];
const AREA_ORDER = [
  "HOSPEDAJE",
  "TOURS",
  "BUFFET",
  "RESTAURANTE",
  "DAYPASS",
  "COMISIONES",
  "MANTENIMIENTO",
  "RECEPCION",
  "RH",
  "HOTEL",
];

function byKnownOrder<T extends { code: string }>(items: T[], order: string[]): T[] {
  return [...items].sort((a, b) => {
    const ia = order.indexOf(a.code);
    const ib = order.indexOf(b.code);
    if (ia === -1 && ib === -1) return a.code.localeCompare(b.code);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function sortCajas<T extends { code: string }>(items: T[]): T[] {
  return byKnownOrder(items, CAJA_ORDER);
}

export function sortAreas<T extends { code: string }>(items: T[]): T[] {
  return byKnownOrder(items, AREA_ORDER);
}
