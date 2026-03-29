const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TOTAL_ELEMENTS = 1_000_000;

const state = {
  selectedIds: new Set(),
  sortOrder: [],
  customElements: new Set(),
};

function getAllIds() {
  const base = Array.from({ length: TOTAL_ELEMENTS }, (_, i) => i + 1);
  const custom = Array.from(state.customElements).filter(id => id < 1 || id > TOTAL_ELEMENTS);
  return [...base, ...custom];
}

app.get('/api/elements/left', (req, res) => {
  const filter = req.query.filter ? req.query.filter.trim() : '';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  const offset = (page - 1) * limit;
  const results = [];
  let count = 0;

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

app.get('/api/elements/right', (req, res) => {
  const filter = req.query.filter ? req.query.filter.trim() : '';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  const offset = (page - 1) * limit;

  const filtered = filter
    ? state.sortOrder.filter(id => String(id).includes(filter))
    : state.sortOrder;

  const slice = filtered.slice(offset, offset + limit);
  const hasMore = offset + limit < filtered.length;

  res.json({ items: slice.map(id => ({ id })), hasMore });
});

app.post('/api/elements/select', (req, res) => {
  const ids = req.body.ids;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be an array' });
  }

  const added = [];
  const duplicates = [];
  for (const id of ids) {
    const numId = Number(id);
    if (!isNaN(numId)) {
      if (state.selectedIds.has(numId)) {
        duplicates.push(numId);
      } else {
        state.selectedIds.add(numId);
        state.sortOrder.push(numId);
        added.push(numId);
      }
    }
  }

  res.json({ ok: true, added, duplicates, selectedCount: state.selectedIds.size });
});

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

app.put('/api/elements/sort', (req, res) => {
  const order = req.body.order;
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order must be an array' });
  }

  const valid = order.filter(id => state.selectedIds.has(Number(id)));
  const included = new Set(valid.map(Number));
  const missing = state.sortOrder.filter(id => !included.has(id));

  state.sortOrder = [...valid.map(Number), ...missing];

  res.json({ ok: true });
});

app.post('/api/elements/add', (req, res) => {
  const ids = req.body.ids;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be an array' });
  }

  const added = [];
  for (const id of ids) {
    const numId = Number(id);
    if (!isNaN(numId)) {
      if (numId < 1 || numId > TOTAL_ELEMENTS) {
        if (!state.customElements.has(numId)) {
          state.customElements.add(numId);
          added.push(numId);
        }
      }
    }
  }

  res.json({ ok: true, added });
});

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
