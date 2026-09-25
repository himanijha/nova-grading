// The symbols groups go by in the room: "Green Circle", "Blue Star". A colour
// and a shape, so a group is findable by either one from across a room, and by
// shape alone for anyone who can't tell the colours apart.

export const COLORS = [
  { key: "GREEN", label: "Green", hex: "#16a34a" },
  { key: "BLUE", label: "Blue", hex: "#2563eb" },
  { key: "YELLOW", label: "Yellow", hex: "#ca8a04" },
  { key: "RED", label: "Red", hex: "#dc2626" },
  { key: "PURPLE", label: "Purple", hex: "#9333ea" },
  { key: "ORANGE", label: "Orange", hex: "#ea580c" },
  { key: "PINK", label: "Pink", hex: "#db2777" },
  { key: "TEAL", label: "Teal", hex: "#0d9488" },
];

export const SHAPES = [
  { key: "CIRCLE", label: "Circle" },
  { key: "STAR", label: "Star" },
  { key: "TRIANGLE", label: "Triangle" },
  { key: "SQUARE", label: "Square" },
  { key: "DIAMOND", label: "Diamond" },
  { key: "HEART", label: "Heart" },
  { key: "HEXAGON", label: "Hexagon" },
  { key: "MOON", label: "Moon" },
];

const COLOR_BY_KEY = Object.fromEntries(COLORS.map((c) => [c.key, c]));
const SHAPE_BY_KEY = Object.fromEntries(SHAPES.map((s) => [s.key, s]));

/**
 * The symbol for the i-th group of a cohort. Stepping the shape one further
 * every lap of the colours keeps all 64 combinations distinct, and means two
 * neighbouring groups never share a colour or a shape.
 */
export function groupSymbol(index) {
  const n = COLORS.length;
  const color = COLORS[index % n];
  const shape = SHAPES[(index + Math.floor(index / n)) % SHAPES.length];
  return { color: color.key, shape: shape.key, name: `${color.label} ${shape.label}` };
}

/** Display details for a stored group's colour and shape. */
export function symbolMeta(color, shape) {
  const c = COLOR_BY_KEY[color] || { label: color, hex: "#6b6577" };
  const s = SHAPE_BY_KEY[shape] || { label: shape };
  return { name: `${c.label} ${s.label}`, hex: c.hex, shape };
}
