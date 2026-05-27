import challengesData from '../assets/challenges.json';

const MS_DAY = 86400000;

const RU_MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export function getChallengesStartDateKey() {
  const raw = challengesData?.startDate;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return '2026-01-01';
}

function getStartDateKey() {
  return getChallengesStartDateKey();
}

function getTemplates() {
  const list = Array.isArray(challengesData?.templates) ? challengesData.templates : [];
  return list.filter((t) => t && typeof t === 'object' && Array.isArray(t.expected) && t.expected.length > 0);
}

export function getDefaultChallengeCommands() {
  const d = challengesData?.defaultCommands;
  if (Array.isArray(d) && d.length) return d.map(String);
  return ['Вперёд', 'Повернуть →', 'Повернуть ←'];
}

/** Локальная дата YYYY-MM-DD (календарный день устройства). */
export function dateKeyLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKeyLocal(key) {
  const parts = String(key || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new Date(NaN);
  const [y, mo, da] = parts;
  return new Date(y, mo - 1, da, 12, 0, 0, 0);
}

export function formatRuDateKey(dateKey) {
  const d = parseDateKeyLocal(dateKey);
  if (Number.isNaN(d.getTime())) return String(dateKey || '');
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function daysFromStartToDateKey(dateKey) {
  const start = parseDateKeyLocal(getStartDateKey());
  const cur = parseDateKeyLocal(dateKey);
  if (Number.isNaN(start.getTime()) || Number.isNaN(cur.getTime())) return 0;
  return Math.floor((cur.getTime() - start.getTime()) / MS_DAY);
}

/**
 * Челлендж календарного дня: id вида daily-YYYY-MM-DD (для прогресса на сервере/локально).
 */
export function buildDailyChallengeForDateKey(dateKey) {
  const templates = getTemplates();
  if (!templates.length) return null;

  const dayOffset = daysFromStartToDateKey(dateKey);
  if (dayOffset < 0) {
    return null;
  }

  const t = templates[dayOffset % templates.length];
  const commands = Array.isArray(t.commands) && t.commands.length ? t.commands.map(String) : getDefaultChallengeCommands();
  const maxProgramLength =
    typeof t.maxProgramLength === 'number' && t.maxProgramLength > 0
      ? t.maxProgramLength
      : Math.max(14, (t.expected?.length || 0) + 4);

  return {
    id: `daily-${dateKey}`,
    dateKey,
    dayOffset,
    title: String(t.title || 'Челлендж'),
    description: String(t.description || ''),
    howToSolve: String(t.howToSolve || ''),
    expected: t.expected.map(String),
    commands,
    maxProgramLength,
  };
}

export function getTodayChallenge() {
  return buildDailyChallengeForDateKey(dateKeyLocal());
}

/** Список дат от fromKey до toKey включительно (по одному дню). */
export function enumerateDateKeysInclusive(fromKey, toKey) {
  const start = parseDateKeyLocal(fromKey);
  const end = parseDateKeyLocal(toKey);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) {
    return [];
  }
  const keys = [];
  for (let t = start.getTime(); t <= end.getTime(); t += MS_DAY) {
    keys.push(dateKeyLocal(new Date(t)));
  }
  return keys;
}

export function getRecentPastDateKeys(endKey, limit = 45, { excludeEnd = false } = {}) {
  const startKey = getStartDateKey();
  const end = parseDateKeyLocal(endKey);
  if (Number.isNaN(end.getTime())) return [];

  const until = excludeEnd ? new Date(end.getTime() - MS_DAY) : end;
  const fromTime = Math.max(parseDateKeyLocal(startKey).getTime(), until.getTime() - MS_DAY * (limit - 1));

  const fromKey = dateKeyLocal(new Date(fromTime));
  const toKey = dateKeyLocal(until);
  return enumerateDateKeysInclusive(fromKey, toKey).reverse();
}
