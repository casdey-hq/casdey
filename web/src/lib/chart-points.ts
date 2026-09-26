// Chart points shared by the server page and the client chart.
export type Point = { key: string; label: string; value: number };

function shortDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, date)));
}

export function dayPoint(day: string, value: number): Point {
  return { key: day, label: shortDay(day), value };
}

export function hourPoint(hour: number, value: number): Point {
  return { key: String(hour), label: `${String(hour).padStart(2, "0")}:00`, value };
}
