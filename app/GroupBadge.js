import { symbolMeta } from "@/lib/symbols";

// Shapes drawn in a 24×24 box. SVG rather than emoji so every symbol exists in
// every colour and looks the same on every phone.
const PATHS = {
  CIRCLE: <circle cx="12" cy="12" r="10" />,
  STAR: <path d="M12 1.8l3.1 6.6 7.1.9-5.2 4.9 1.3 7.1L12 17.8l-6.3 3.5 1.3-7.1-5.2-4.9 7.1-.9z" />,
  TRIANGLE: <path d="M12 2.5l10.5 18.5H1.5z" />,
  SQUARE: <rect x="3" y="3" width="18" height="18" rx="2" />,
  DIAMOND: <path d="M12 1.5l10.5 10.5L12 22.5 1.5 12z" />,
  HEART: <path d="M12 21.5l-1.5-1.3C5 15.2 1.8 12.3 1.8 8.5 1.8 5.5 4.2 3 7.2 3c1.8 0 3.5.8 4.8 2.2C13.3 3.8 15 3 16.8 3c3 0 5.4 2.5 5.4 5.5 0 3.8-3.2 6.7-8.7 11.7z" />,
  HEXAGON: <path d="M12 1.5l9.1 5.25v10.5L12 22.5l-9.1-5.25V6.75z" />,
  MOON: <path d="M15.5 2.2A10 10 0 1 0 21.8 15 8 8 0 0 1 15.5 2.2z" />,
};

export function GroupShape({ color, shape, size = 18 }) {
  const { hex, name } = symbolMeta(color, shape);
  return (
    <svg
      className="gshape"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={hex}
      role="img"
      aria-label={name}
    >
      {PATHS[shape] || PATHS.CIRCLE}
    </svg>
  );
}

/** Shape and name together: "▲ Yellow Triangle". */
export default function GroupBadge({ group, size = 18, big = false }) {
  if (!group) return <span className="gbadge none">No group</span>;
  const { name, hex } = symbolMeta(group.color, group.shape);
  return (
    <span className={`gbadge${big ? " big" : ""}`} style={{ "--gc": hex }}>
      <GroupShape color={group.color} shape={group.shape} size={size} />
      <span>{name}</span>
    </span>
  );
}
