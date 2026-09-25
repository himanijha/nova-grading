/** "Sat, Oct 4, 10:00 AM" in the viewer's own time zone. */
export function formatWhen(iso) {
  if (!iso) return "No time set";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
