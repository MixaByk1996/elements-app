import React, { useRef } from 'react';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import './App.css';

export default function App() {
  // Refs to trigger refreshes in child panels
  const leftRefreshRef = useRef(null);
  const rightRefreshRef = useRef(null);

  // When an element is selected in left panel, right panel should refresh
  const handleSelect = () => {
    if (rightRefreshRef.current) rightRefreshRef.current();
  };

  // When an element is deselected in right panel, left panel should refresh
  const handleDeselect = () => {
    if (leftRefreshRef.current) leftRefreshRef.current();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Elements List</h1>
        <p>Click an element on the left to select it. Drag to reorder on the right.</p>
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
