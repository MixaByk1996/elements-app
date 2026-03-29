import React, { useRef } from 'react';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import './App.css';

export default function App() {
  const leftRefreshRef = useRef(null);
  const rightRefreshRef = useRef(null);

  const handleSelect = () => {
    if (rightRefreshRef.current) rightRefreshRef.current();
  };

  const handleDeselect = () => {
    if (leftRefreshRef.current) leftRefreshRef.current();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Список элементов</h1>
        <p>Нажмите на элемент слева, чтобы выбрать его. Перетащите для изменения порядка справа.</p>
      </header>
      <div className="panels">
        <LeftPanel
          onSelect={handleSelect}
          refreshRef={leftRefreshRef}
        />
        <RightPanel
          onDeselect={handleDeselect}
          refreshRef={rightRefreshRef}
        />
      </div>
    </div>
  );
}
