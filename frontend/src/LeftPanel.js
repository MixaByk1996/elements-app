import React, { useEffect, useRef, useCallback, useState } from 'react';
import { fetchLeftElements, queueAdd, queueSelect } from './api';
import { useInfiniteList } from './useInfiniteList';

export function LeftPanel({ onSelect, refreshRef }) {
  const fetcher = useCallback(
    (filter, page) => fetchLeftElements(filter, page),
    []
  );

  const { items, hasMore, loading, filter, setFilter, load, refresh } = useInfiniteList(fetcher);

  const bottomRef = useRef(null);
  const [newId, setNewId] = useState('');

  // Expose refresh to parent
  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = () => {
        refresh();
        load(true, filter);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshRef, filter]);
  const [addError, setAddError] = useState('');

  // Initial load
  useEffect(() => {
    load(true, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-load when filter changes
  useEffect(() => {
    load(true, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!bottomRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          load();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, load]);

  const handleSelect = (id) => {
    queueSelect([id], () => {
      // After server confirms, refresh both panels via callback
      onSelect(id);
    });
    // Optimistic: remove from left list immediately
    onSelect(id);
  };

  const handleAddElement = () => {
    const parsed = parseInt(newId, 10);
    if (isNaN(parsed)) {
      setAddError('Please enter a valid integer ID');
      return;
    }
    setAddError('');
    queueAdd([parsed], () => {
      // After add is flushed, refresh left panel
      refresh();
      load(true, filter);
    });
    setNewId('');
    // Optimistic: if the ID is outside 1..1M range, show a notice
  };

  return (
    <div className="panel">
      <h2>All Elements</h2>

      <div className="panel-controls">
        <input
          type="text"
          placeholder="Filter by ID..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="filter-input"
        />
      </div>

      <div className="add-element">
        <input
          type="number"
          placeholder="New element ID..."
          value={newId}
          onChange={e => setNewId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddElement()}
          className="filter-input"
        />
        <button onClick={handleAddElement} className="btn">Add</button>
        {addError && <span className="error">{addError}</span>}
      </div>

      <div className="list-container">
        {items.map(item => (
          <div
            key={item.id}
            className="list-item"
            onClick={() => handleSelect(item.id)}
            title="Click to select"
          >
            <span className="item-id">#{item.id}</span>
            <span className="item-action">→</span>
          </div>
        ))}
        {loading && <div className="loading">Loading...</div>}
        {!hasMore && !loading && items.length === 0 && (
          <div className="empty">No elements found</div>
        )}
        <div ref={bottomRef} className="scroll-anchor" />
      </div>
    </div>
  );
}
