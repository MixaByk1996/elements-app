import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchRightElements, queueDeselect, queueSort } from './api';
import { useInfiniteList } from './useInfiniteList';

function SortableItem({ item, onDeselect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="list-item sortable"
      {...attributes}
    >
      <span className="drag-handle" {...listeners}>⠿</span>
      <span className="item-id">#{item.id}</span>
      <button
        className="deselect-btn"
        onClick={() => onDeselect(item.id)}
        title="Переместить обратно в левую панель"
      >
        ←
      </button>
    </div>
  );
}

export function RightPanel({ onDeselect, refreshRef }) {
  const fetcher = useCallback(
    (filter, page) => fetchRightElements(filter, page),
    []
  );

  const { items, setItems, hasMore, loading, filter, setFilter, load, refresh } =
    useInfiniteList(fetcher);

  const bottomRef = useRef(null);
  const [activeId, setActiveId] = useState(null);

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

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setItems(prev => {
      const oldIndex = prev.findIndex(i => i.id === active.id);
      const newIndex = prev.findIndex(i => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      queueSort(newOrder.map(i => i.id));
      return newOrder;
    });
  };

  const handleDeselect = (id) => {
    queueDeselect([id], () => onDeselect(id));
    setItems(prev => prev.filter(item => item.id !== id));
    onDeselect(id);
  };

  const activeItem = activeId != null ? items.find(i => i.id === activeId) : null;

  return (
    <div className="panel">
      <h2>Выбранные элементы</h2>

      <div className="panel-controls">
        <input
          type="text"
          placeholder="Фильтр по ID..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="filter-input"
        />
      </div>

      <div className="list-container">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map(item => (
              <SortableItem key={item.id} item={item} onDeselect={handleDeselect} />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeItem ? (
              <div className="list-item sortable drag-overlay">
                <span className="drag-handle">⠿</span>
                <span className="item-id">#{activeItem.id}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {loading && <div className="loading">Загрузка...</div>}
        {!hasMore && !loading && items.length === 0 && (
          <div className="empty">Нет выбранных элементов</div>
        )}
        <div ref={bottomRef} className="scroll-anchor" />
      </div>
    </div>
  );
}
