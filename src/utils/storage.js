const ACTIVITIES_KEY    = 'da_activities';
const RECORDS_KEY       = 'da_records';
const GOOGLE_CONFIG_KEY = 'da_google_config';

export function getActivities() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITIES_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveActivities(activities) {
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
}

export function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function getGoogleConfig() {
  try {
    return JSON.parse(localStorage.getItem(GOOGLE_CONFIG_KEY)) || {};
  } catch { return {}; }
}

export function saveGoogleConfig(cfg) {
  localStorage.setItem(GOOGLE_CONFIG_KEY, JSON.stringify(cfg));
}

export function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns the 7 date keys of the current week (Mon–Sun)
export function getCurrentWeekKeys() {
  return getWeekKeys(0);
}

// offset=0 → current week, offset=-1 → last week, etc.
export function getWeekKeys(offset = 0) {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toKey(d);
  });
}

// Returns { start, end } display strings for a week offset
export function getWeekLabel(offset = 0) {
  const keys = getWeekKeys(offset);
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const parse = k => { const [y, m, d] = k.split('-'); return { d: +d, m: +m - 1, y: +y }; };
  const s = parse(keys[0]);
  const e = parse(keys[6]);
  if (s.m === e.m)
    return `${s.d}–${e.d} ${MONTHS[s.m]} ${s.y}`;
  return `${s.d} ${MONTHS[s.m]} – ${e.d} ${MONTHS[e.m]} ${e.y}`;
}
