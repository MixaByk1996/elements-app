const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TOTAL_ELEMENTS = 1_000_000;

// In-memory state
// All 1M IDs are implicitly in the left list unless selected
// selectedIds: Set of selected element IDs (in right panel)
// sortOrder: ordered array of selected IDs (defines order in right panel)
// customElements: Map of custom-added IDs (those added manually, not 1-1M range)

const state = {
  selectedIds: new Set(),
  sortOrder: [],      // Array of selected IDs in user-defined order
  customElements: new Set(), // Extra IDs added by users
};

// Helper: get all existing IDs (1..1M + custom ones)
function getAllIds() {
  const base = Array.from({ length: TOTAL_ELEMENTS }, (_, i) => i + 1);
  const custom = Array.from(state.customElements).filter(id => id < 1 || id > TOTAL_ELEMENTS);
  return [...base, ...custom];
}

// GET /api/elements/left
// Returns unselected elements with optional filter and pagination
// Query params: filter (string), page (int, 1-based), limit (int, default 20)
app.get('/api/elements/left', (req, res) => {
  const filter = req.query.filter ? req.query.filter.trim() : '';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  // Stream through IDs without building giant array
  const offset = (page - 1) * limit;
  const results = [];
  let count = 0;

  // Base range 1..TOTAL_ELEMENTS
  let i = 1;
  while (i <= TOTAL_ELEMENTS && results.length < limit) {
    if (!state.selectedIds.has(i)) {
      const idStr = String(i);
      if (!filter || idStr.includes(filter)) {
        if (count >= offset) {
          results.push({ id: i });
        }
        count++;
      }
    }
    i++;
  }

  // Also check custom elements outside base range
  if (results.length < limit) {
    for (const id of state.customElements) {
      if (id < 1 || id > TOTAL_ELEMENTS) {
        if (!state.selectedIds.has(id)) {
          const idStr = String(id);
          if (!filter || idStr.includes(filter)) {
            if (count >= offset) {
              if (results.length < limit) {
                results.push({ id });
              }
            }
            count++;
          }
        }
      }
    }
  }

  res.json({ items: results, hasMore: results.length === limit });
});

// GET /api/elements/right
// Returns selected elements in sort order with optional filter and pagination
// Query params: filter (string), page (int, 1-based), limit (int, default 20)
app.get('/api/elements/right', (req, res) => {
  const filter = req.query.filter ? req.query.filter.trim() : '';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  const offset = (page - 1) * limit;

  // Apply filter to sortOrder
  const filtered = filter
    ? state.sortOrder.filter(id => String(id).includes(filter))
    : state.sortOrder;

  const slice = filtered.slice(offset, offset + limit);
  const hasMore = offset + limit < filtered.length;

  res.json({ items: slice.map(id => ({ id })), hasMore });
});

// POST /api/elements/select
// Body: { ids: number[] }
// Moves elements from left to right (adds to selection)
app.post('/api/elements/select', (req, res) => {
  const ids = req.body.ids;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be an array' });
  }

  for (const id of ids) {
    const numId = Number(id);
    if (!isNaN(numId) && !state.selectedIds.has(numId)) {
      state.selectedIds.add(numId);
      state.sortOrder.push(numId);
    }
  }

  res.json({ ok: true, selectedCount: state.selectedIds.size });
});

// POST /api/elements/deselect
// Body: { ids: number[] }
// Moves elements from right to left (removes from selection)
app.post('/api/elements/deselect', (req, res) => {
  const ids = req.body.ids;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be an array' });
  }

  for (const id of ids) {
    const numId = Number(id);
    if (!isNaN(numId) && state.selectedIds.has(numId)) {
      state.selectedIds.delete(numId);
      state.sortOrder = state.sortOrder.filter(i => i !== numId);
    }
  }

  res.json({ ok: true, selectedCount: state.selectedIds.size });
});

// PUT /api/elements/sort
// Body: { order: number[] }  — full new sort order of selected IDs
app.put('/api/elements/sort', (req, res) => {
  const order = req.body.order;
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order must be an array' });
  }

  // Validate: all provided IDs must be in selectedIds
  const valid = order.filter(id => state.selectedIds.has(Number(id)));
  // Append any selected IDs not included in the new order (safety measure)
  const included = new Set(valid.map(Number));
  const missing = state.sortOrder.filter(id => !included.has(id));

  state.sortOrder = [...valid.map(Number), ...missing];

  res.json({ ok: true });
});

// POST /api/elements/add
// Body: { ids: number[] }
// Adds new custom elements (deduplication: ignore already-existing)
app.post('/api/elements/add', (req, res) => {
  const ids = req.body.ids;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be an array' });
  }

  const added = [];
  for (const id of ids) {
    const numId = Number(id);
    if (!isNaN(numId)) {
      // Add to customElements if outside base range
      if (numId < 1 || numId > TOTAL_ELEMENTS) {
        if (!state.customElements.has(numId)) {
          state.customElements.add(numId);
          added.push(numId);
        }
      }
      // IDs in 1..1M range already exist by default — no-op
    }
  }

  res.json({ ok: true, added });
});

// GET /api/state
// Returns full persisted state (selected IDs + sort order) for client-side restore
app.get('/api/state', (req, res) => {
  res.json({
    selectedIds: Array.from(state.selectedIds),
    sortOrder: state.sortOrder,
    customElements: Array.from(state.customElements),
  });
});

app.listen(PORT, () => {
  console.log(`Elements backend running on http://localhost:${PORT}`);
});
