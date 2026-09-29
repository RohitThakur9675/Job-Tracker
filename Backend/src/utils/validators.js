// Dates are stored as "YYYY-MM-DD" strings on purpose: the frontend treats them as
// calendar days (no time zone), so strings avoid off-by-one-day bugs.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Turns raw user input into a literal match for MongoDB's $regex — without this,
// characters like ( ) . * + in a search box (e.g. "C++", "Acme (India)") either throw
// or silently match the wrong things, since they're regex metacharacters otherwise.
export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isValidDateString(value) {
  if (value === "") return true; // empty = "not set"
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function isValidTimeString(value) {
  return value === "" || (typeof value === "string" && TIME_RE.test(value));
}

// Only http(s) links: the UI opens these with window.open(), so javascript: URLs must never be stored.
export function isHttpUrl(value) {
  if (value === "") return true;
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function isEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
