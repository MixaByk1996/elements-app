const BASE_URL = process.env.REACT_APP_API_URL || '';

const ADD_INTERVAL = 10_000;
const READ_INTERVAL = 1_000;

let pendingAddIds = new Set();
let addFlushTimer = null;

let pendingSelectIds = new Set();
let pendingDeselectIds = new Set();
let pendingSortOrder = null;

let readFlushTimer = null;

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

export function queueAdd(ids, onFlushed) {
  ids.forEach(id => pendingAddIds.add(id));
  if (onFlushed) flushCallbacks.add.push(onFlushed);
  scheduleAddFlush();
}

export function queueSelect(ids, onFlushed) {
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
  pendingSortOrder = order;
  if (onFlushed) flushCallbacks.readModify.push(onFlushed);
  scheduleReadFlush();
}

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
