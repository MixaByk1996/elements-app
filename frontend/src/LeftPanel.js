import React, { useEffect, useRef, useCallback, useState } from 'react';
import { fetchLeftElements, queueAdd, queueSelect } from './api';
import { useInfiniteList } from './useInfiniteList';

export function LeftPanel({ onSelect, refreshRef }) {
  const fetcher = useCallback(
    (filter, page) => fetchLeftElements(filter, page),
    []
  );

  const { items, setItems, hasMore, loading, filter, setFilter, load, refresh } = useInfiniteList(fetcher);

  const bottomRef = useRef(null);
  const [newId, setNewId] = useState('');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = () => {
        refresh();
        load(true, filter);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshRef, filter]);

  useEffect(() => {
    load(true, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(true, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

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
    setItems(prev => prev.filter(item => item.id !== id));
    queueSelect([id], (result) => {
      if (result && result.duplicates && result.duplicates.includes(id)) {
        setAddError(`Элемент #${id} уже выбран`);
        refresh();
        load(true, filter);
        return;
      }
      onSelect(id);
    });
  };

  const handleAddElement = () => {
    const parsed = parseInt(newId, 10);
    if (isNaN(parsed)) {
      setAddError('Введите корректный числовой ID');
      return;
    }
    setAddError('');
    queueAdd([parsed], (result, requestedIds) => {
      if (result && result.added && requestedIds) {
        const notAdded = requestedIds.filter(id => !result.added.includes(id));
        if (notAdded.includes(parsed)) {
          setAddError(`Элемент #${parsed} уже существует`);
        }
      }
      refresh();
      load(true, filter);
    });
    setNewId('');
  };

  return (
    <div className="panel">
      <h2>Все элементы</h2>

      <div className="panel-controls">
        <input
          type="text"
          placeholder="Фильтр по ID..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="filter-input"
        />
      </div>

      <div className="add-element">
        <input
          type="number"
          placeholder="ID нового элемента..."
          value={newId}
          onChange={e => setNewId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddElement()}
          className="filter-input"
        />
        <button onClick={handleAddElement} className="btn">Добавить</button>
        {addError && <span className="error">{addError}</span>}
      </div>

      <div className="list-container">
        {items.map(item => (
          <div
            key={item.id}
            className="list-item"
            onClick={() => handleSelect(item.id)}
            title="Нажмите для выбора"
          >
            <span className="item-id">#{item.id}</span>
            <span className="item-action">→</span>
          </div>
        ))}
        {loading && <div className="loading">Загрузка...</div>}
        {!hasMore && !loading && items.length === 0 && (
          <div className="empty">Элементы не найдены</div>
        )}
        <div ref={bottomRef} className="scroll-anchor" />
      </div>
    </div>
  );
}
