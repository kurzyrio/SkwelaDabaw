/**
 * SkwelaDabaw — Per-Account LocalStorage Partitioning & Sync Tombstone Helpers
 *
 * Isolates cached schedules, saved places, favorite routes, recent trips,
 * bulletin bookmarks, and deletion tombstones per authenticated UID (or 'guest')
 * so offline account switches never leak or clobber another user's records.
 */

const USER_SESSION_STORAGE_KEY = 'skweladabaw_user_session';
const TOMBSTONE_KEY_PREFIX = 'skweladabaw_sync_tombstones';
const LEGACY_MIGRATED_PREFIX = 'skweladabaw_legacy_migrated';
const SERVER_CLOCK_OFFSET_KEY = 'skweladabaw_server_clock_offset_ms';

let networkSyncTail: Promise<void> = Promise.resolve();

/**
 * Serializes network sync operations across cloudSyncService and taskSyncService
 * so background pulls never overlap or resurrect items mid-push/delete.
 */
export function enqueueSyncOperation<T>(op: () => Promise<T>): Promise<T> {
  const run = networkSyncTail.then(op, op);
  networkSyncTail = run.then(() => undefined, () => undefined);
  return run;
}

export function updateServerClockOffset(serverNowIso?: string | null): void {
  if (!serverNowIso || typeof localStorage === 'undefined') return;
  const serverMs = parseUtcTimestampMs(serverNowIso);
  if (serverMs <= 0) return;
  const offset = serverMs - Date.now();
  // Sanity-clamp offset within +/- 7 days to guard against malformed responses
  if (Math.abs(offset) <= 7 * 24 * 60 * 60 * 1000) {
    try {
      localStorage.setItem(SERVER_CLOCK_OFFSET_KEY, String(offset));
    } catch {}
  }
}

export function getAdjustedUtcNowMs(): number {
  if (typeof localStorage === 'undefined') return Date.now();
  try {
    const raw = localStorage.getItem(SERVER_CLOCK_OFFSET_KEY);
    if (raw) {
      const offset = Number(raw);
      if (Number.isFinite(offset) && Math.abs(offset) <= 7 * 24 * 60 * 60 * 1000) {
        return Date.now() + offset;
      }
    }
  } catch {}
  return Date.now();
}

export function computeTombstoneDeletedAt(knownUpdatedAt?: string | null): string {
  const nowMs = getAdjustedUtcNowMs();
  const knownMs = parseUtcTimestampMs(knownUpdatedAt);
  const effectiveMs = knownMs > 0 ? Math.max(nowMs, knownMs + 1000) : nowMs;
  return new Date(effectiveMs).toISOString();
}

export type SyncTombstoneKind =
  | 'schedules'
  | 'routines'
  | 'expenses'
  | 'transit'
  | 'grades'
  | 'places'
  | 'tasks';

export interface TombstoneEntry {
  uuid: string;
  deletedAt: string;
}

export interface SyncTombstones {
  schedules: TombstoneEntry[];
  routines: TombstoneEntry[];
  expenses: TombstoneEntry[];
  transit: TombstoneEntry[];
  grades: TombstoneEntry[];
  places: TombstoneEntry[];
  tasks: TombstoneEntry[];
  bookmarks: string[];
  clearSchedulesBefore?: string;
}

function emptyTombstones(): SyncTombstones {
  return {
    schedules: [],
    routines: [],
    expenses: [],
    transit: [],
    grades: [],
    places: [],
    tasks: [],
    bookmarks: []
  };
}

/** Generate a persistent RFC4122-style UUID for Dexie & syncable records */
export function generateSyncUUID(prefix = 'rec'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

/** Resolve active account UID from explicit override or saved session */
export function getCurrentStorageUid(explicitUid?: string): string {
  if (explicitUid && explicitUid.trim()) {
    return explicitUid.trim();
  }
  if (typeof localStorage === 'undefined') return 'guest';
  try {
    const raw = localStorage.getItem(USER_SESSION_STORAGE_KEY);
    if (!raw) return 'guest';
    const parsed = JSON.parse(raw);
    if (parsed && parsed.isLoggedIn && parsed.uid) {
      return String(parsed.uid);
    }
  } catch {
    // Corrupted session JSON falls back cleanly to guest scope
  }
  return 'guest';
}

/** Build a UID-namespaced localStorage key */
export function scopedKey(baseKey: string, explicitUid?: string): string {
  return `${baseKey}_${getCurrentStorageUid(explicitUid)}`;
}

/**
 * Reads a UID-scoped JSON array/value, performing a one-time legacy migration
 * from un-namespaced global keys onto the first signed-in/guest scope.
 */
export function readScopedJson<T>(
  baseKey: string,
  fallback: T,
  explicitUid?: string,
  migrateLegacy = true
): T {
  if (typeof localStorage === 'undefined') return fallback;
  const uid = getCurrentStorageUid(explicitUid);
  const namespaced = `${baseKey}_${uid}`;

  try {
    const raw = localStorage.getItem(namespaced);
    if (raw !== null) {
      return JSON.parse(raw) as T;
    }

    if (migrateLegacy) {
      const migratedMarker = `${LEGACY_MIGRATED_PREFIX}_${baseKey}`;
      const alreadyMigrated = localStorage.getItem(migratedMarker) === 'true';
      const legacyRaw = localStorage.getItem(baseKey);
      if (legacyRaw !== null && !alreadyMigrated) {
        const parsed = JSON.parse(legacyRaw) as T;
        localStorage.setItem(namespaced, legacyRaw);
        localStorage.setItem(migratedMarker, 'true');
        localStorage.removeItem(baseKey);
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors and return safe fallback
  }

  return fallback;
}

export function writeScopedJson<T>(baseKey: string, value: T, explicitUid?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(scopedKey(baseKey, explicitUid), JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function readSyncTombstones(explicitUid?: string): SyncTombstones {
  if (typeof localStorage === 'undefined') return emptyTombstones();
  try {
    const raw = localStorage.getItem(scopedKey(TOMBSTONE_KEY_PREFIX, explicitUid));
    if (!raw) return emptyTombstones();
    const parsed = JSON.parse(raw);
    return {
      ...emptyTombstones(),
      ...parsed
    };
  } catch {
    return emptyTombstones();
  }
}

function writeSyncTombstones(tombstones: SyncTombstones, explicitUid?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(scopedKey(TOMBSTONE_KEY_PREFIX, explicitUid), JSON.stringify(tombstones));
  } catch {}
}

/** Record an explicit record deletion so cloud sync deletes only that item */
export function recordSyncDeletion(
  kind: SyncTombstoneKind,
  uuid?: string | null,
  explicitUid?: string,
  knownUpdatedAt?: string | null
): void {
  if (!uuid || !uuid.trim()) return;
  const cleanUuid = uuid.trim();
  const deletedAt = computeTombstoneDeletedAt(knownUpdatedAt);
  const tombstones = readSyncTombstones(explicitUid);
  const existing = tombstones[kind].filter((entry) => entry.uuid !== cleanUuid);
  existing.push({ uuid: cleanUuid, deletedAt });
  tombstones[kind] = existing;
  writeSyncTombstones(tombstones, explicitUid);
}

/** Remove a pending deletion tombstone if the item is recreated/restored locally before push */
export function clearSyncDeletion(
  kind: SyncTombstoneKind,
  uuid?: string | null,
  explicitUid?: string
): void {
  if (!uuid || !uuid.trim()) return;
  const cleanUuid = uuid.trim();
  const tombstones = readSyncTombstones(explicitUid);
  const next = tombstones[kind].filter((entry) => entry.uuid !== cleanUuid);
  if (next.length !== tombstones[kind].length) {
    tombstones[kind] = next;
    writeSyncTombstones(tombstones, explicitUid);
  }
}

/** Record deletion of a bulletin bookmark and cancel any pending re-add */
export function recordBookmarkDeletion(announcementId: string, removed: boolean, explicitUid?: string): void {
  if (!announcementId) return;
  const tombstones = readSyncTombstones(explicitUid);
  const next = new Set(tombstones.bookmarks || []);
  if (removed) {
    next.add(announcementId);
  } else {
    next.delete(announcementId);
  }
  tombstones.bookmarks = Array.from(next);
  writeSyncTombstones(tombstones, explicitUid);
}

/** Record an explicit Delete-All schedules action with a UTC cutoff timestamp */
export function recordClearAllSchedules(
  entries: Array<string | { uuid?: string; updatedAt?: string } | undefined>,
  explicitUid?: string
): void {
  const tombstones = readSyncTombstones(explicitUid);
  let maxKnownMs = getAdjustedUtcNowMs();
  const existingMap = new Map<string, TombstoneEntry>();
  for (const item of tombstones.schedules) {
    existingMap.set(item.uuid, item);
  }
  for (const raw of entries) {
    if (!raw) continue;
    const id = typeof raw === 'string' ? raw : raw.uuid;
    const updAt = typeof raw === 'string' ? undefined : raw.updatedAt;
    const updMs = parseUtcTimestampMs(updAt);
    if (updMs > maxKnownMs) {
      maxKnownMs = updMs + 1000;
    }
    if (id && id.trim()) {
      existingMap.set(id.trim(), { uuid: id.trim(), deletedAt: computeTombstoneDeletedAt(updAt) });
    }
  }
  tombstones.schedules = Array.from(existingMap.values());
  const existingClearMs = parseUtcTimestampMs(tombstones.clearSchedulesBefore);
  tombstones.clearSchedulesBefore = new Date(Math.max(maxKnownMs, existingClearMs)).toISOString();
  writeSyncTombstones(tombstones, explicitUid);
}

/** Merge incoming tombstones (e.g. from account-switch backup) into active scoped tombstones */
export function mergeSyncTombstones(incoming?: SyncTombstones | null, explicitUid?: string): void {
  if (!incoming) return;
  const current = readSyncTombstones(explicitUid);
  const kinds: SyncTombstoneKind[] = ['schedules', 'routines', 'expenses', 'transit', 'grades', 'places', 'tasks'];
  for (const kind of kinds) {
    const byUuid = new Map<string, TombstoneEntry>();
    for (const cur of current[kind] || []) {
      if (cur?.uuid) byUuid.set(cur.uuid, cur);
    }
    for (const inc of incoming[kind] || []) {
      if (!inc?.uuid) continue;
      const existing = byUuid.get(inc.uuid);
      if (!existing || parseUtcTimestampMs(inc.deletedAt) > parseUtcTimestampMs(existing.deletedAt)) {
        byUuid.set(inc.uuid, inc);
      }
    }
    current[kind] = Array.from(byUuid.values());
  }
  const mergedBm = new Set([...(current.bookmarks || []), ...(incoming.bookmarks || [])]);
  current.bookmarks = Array.from(mergedBm);

  const curClearMs = parseUtcTimestampMs(current.clearSchedulesBefore);
  const incClearMs = parseUtcTimestampMs(incoming.clearSchedulesBefore);
  if (incClearMs > curClearMs && incoming.clearSchedulesBefore) {
    current.clearSchedulesBefore = incoming.clearSchedulesBefore;
  }
  writeSyncTombstones(current, explicitUid);
}

/** Remove only tombstones that were included in a confirmed server sync snapshot */
export function clearSyncedTombstones(pushed: SyncTombstones, explicitUid?: string): void {
  const current = readSyncTombstones(explicitUid);
  const kinds: SyncTombstoneKind[] = ['schedules', 'routines', 'expenses', 'transit', 'grades', 'places', 'tasks'];
  for (const kind of kinds) {
    const pushedMap = new Map(pushed[kind].map((p) => [p.uuid, p.deletedAt]));
    current[kind] = current[kind].filter((cur) => {
      const pushedAt = pushedMap.get(cur.uuid);
      return !pushedAt || cur.deletedAt > pushedAt;
    });
  }
  const pushedBm = new Set(pushed.bookmarks || []);
  current.bookmarks = current.bookmarks.filter((id) => !pushedBm.has(id));
  if (pushed.clearSchedulesBefore && current.clearSchedulesBefore === pushed.clearSchedulesBefore) {
    delete current.clearSchedulesBefore;
  }
  writeSyncTombstones(current, explicitUid);
}

export function hasPendingTombstones(explicitUid?: string): boolean {
  const t = readSyncTombstones(explicitUid);
  return Boolean(
    t.clearSchedulesBefore ||
    t.schedules.length > 0 ||
    t.routines.length > 0 ||
    t.expenses.length > 0 ||
    t.transit.length > 0 ||
    t.grades.length > 0 ||
    t.places.length > 0 ||
    t.tasks.length > 0 ||
    t.bookmarks.length > 0
  );
}

/** Parse SQL UTC datetime ('YYYY-MM-DD HH:MM:SS') or ISO strings into epoch ms accurately */
export function parseUtcTimestampMs(ts?: string | null): number {
  if (!ts) return 0;
  const trimmed = String(ts).trim();
  if (!trimmed) return 0;
  const isoCandidate = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(trimmed)
    ? trimmed.replace(/\s+/, 'T') + 'Z'
    : trimmed;
  const ms = Date.parse(isoCandidate);
  return Number.isFinite(ms) ? ms : 0;
}

/** Remove all UID-scoped localStorage keys for a specific account */
export function purgeUserScopedStorage(uid: string): void {
  if (typeof localStorage === 'undefined' || !uid) return;
  const prefixes = [
    'skweladabaw_cached_schedules',
    'skweladabaw_cached_tasks',
    'skweladabaw_cached_routines',
    'skweladabaw_cached_expenses',
    'skweladabaw_cached_grades',
    'skweladabaw_account_backup',
    'skweladabaw_has_hydrated',
    'skweladabaw_saved_places',
    'skweladabaw_favorite_routes',
    'skweladabaw_recent_trips',
    'skweladabaw_bookmarked_bulletins',
    'skweladabaw_explicit_empty_schedules',
    'skweladabaw_explicit_empty_tasks',
    TOMBSTONE_KEY_PREFIX
  ];
  for (const prefix of prefixes) {
    try { localStorage.removeItem(`${prefix}_${uid}`); } catch {}
  }
}
