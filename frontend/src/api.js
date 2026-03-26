/**
 * Request queue with deduplication and batching.
 *
 * - "add" requests are batched and flushed every 10 seconds
 * - "read/modify" requests (select, deselect, sort, get) are batched and flushed every 1 second
 * - Deduplication: identical in-flight requests are merged (same key won't be queued twice)
 */

const BASE_URL = process.env.REACT_APP_API_URL || '';

// ─── Simple queue implementation ─────────────────────────────────────────────

const ADD_INTERVAL = 10_000;  // 10 seconds for add batching
const READ_INTERVAL = 1_000;  // 1 second for read/modify batching

// Pending add IDs (deduped set)
let pendingAddIds = new Set();
let addFlushTimer = null;

// Pending select IDs
let pendingSelectIds = new Set();
// Pending deselect IDs
let pendingDeselectIds = new Set();
// Latest sort order (replaces previous pending sort)
let pendingSortOrder = null;

let readFlushTimer = null;

// Callbacks to invoke after flush
const flushCallbacks = { add: [], readModify: [] };

function scheduleAddFlush() {
  if (addFlushTimer) return;
  addFlushTimer = setTimeout(flushAddQueue, ADD_INTERVAL);
}

function scheduleReadFlush() {
  if (readFlushTimer) return;
  readFlushTimer = setTimeout(flushReadQueue, READ_INTERVAL);
}

async function flushAddQueue() {
  addFlushTimer = null;
  if (pendingAddIds.size === 0) return;

  const ids = Array.from(pendingAddIds);
  pendingAddIds = new Set();

  try {
    await fetch(`${BASE_URL}/api/elements/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  } catch (e) {
    console.error('Failed to flush add queue:', e);
    // Re-add on failure
    ids.forEach(id => pendingAddIds.add(id));
    scheduleAddFlush();
    return;
  }

  const cbs = flushCallbacks.add.splice(0);
  cbs.forEach(cb => cb());
}

async function flushReadQueue() {
  readFlushTimer = null;

  const selectIds = Array.from(pendingSelectIds);
  const deselectIds = Array.from(pendingDeselectIds);
  const sortOrder = pendingSortOrder;

  pendingSelectIds = new Set();
  pendingDeselectIds = new Set();
  pendingSortOrder = null;

  const promises = [];

  if (selectIds.length > 0) {
    promises.push(
      fetch(`${BASE_URL}/api/elements/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectIds }),
      })
    );
  }

  if (deselectIds.length > 0) {
    promises.push(
      fetch(`${BASE_URL}/api/elements/deselect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deselectIds }),
      })
    );
  }

  if (sortOrder !== null) {
    promises.push(
      fetch(`${BASE_URL}/api/elements/sort`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: sortOrder }),
      })
    );
  }

  try {
    await Promise.all(promises);
  } catch (e) {
    console.error('Failed to flush read/modify queue:', e);
  }

  const cbs = flushCallbacks.readModify.splice(0);
  cbs.forEach(cb => cb());
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function queueAdd(ids, onFlushed) {
  ids.forEach(id => pendingAddIds.add(id));
  if (onFlushed) flushCallbacks.add.push(onFlushed);
  scheduleAddFlush();
}

export function queueSelect(ids, onFlushed) {
  // Remove from pending deselect (cancel-out)
  ids.forEach(id => {
    pendingDeselectIds.delete(id);
    pendingSelectIds.add(id);
  });
  if (onFlushed) flushCallbacks.readModify.push(onFlushed);
  scheduleReadFlush();
}

export function queueDeselect(ids, onFlushed) {
  ids.forEach(id => {
    pendingSelectIds.delete(id);
    pendingDeselectIds.add(id);
  });
  if (onFlushed) flushCallbacks.readModify.push(onFlushed);
  scheduleReadFlush();
}

export function queueSort(order, onFlushed) {
  pendingSortOrder = order; // Latest wins
  if (onFlushed) flushCallbacks.readModify.push(onFlushed);
  scheduleReadFlush();
}

// Immediate fetch (bypasses queue — used for initial data load)
export async function fetchLeftElements(filter, page, limit = 20) {
  const params = new URLSearchParams({ page, limit });
  if (filter) params.set('filter', filter);
  const res = await fetch(`${BASE_URL}/api/elements/left?${params}`);
  return res.json();
}

export async function fetchRightElements(filter, page, limit = 20) {
  const params = new URLSearchParams({ page, limit });
  if (filter) params.set('filter', filter);
  const res = await fetch(`${BASE_URL}/api/elements/right?${params}`);
  return res.json();
}

export async function fetchState() {
  const res = await fetch(`${BASE_URL}/api/state`);
  return res.json();
}
