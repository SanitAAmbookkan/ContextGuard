import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Dashboard from './Dashboard.jsx';
import SyncView from './SyncView.jsx';
import MiniGame from './MiniGame.jsx';
import './index.css';

console.log("ContextGuard: main.jsx loaded");

window.onerror = (msg, url, line, col, err) => {
  console.error("ContextGuard EXTENSION ERROR:", msg, url, line, col, err);
};

try {
  console.log("ContextGuard: Starting React mount...");
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error("Could not find root element");
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sync" element={<SyncView />} />
          <Route path="/game" element={<MiniGame />} />
        </Routes>
      </MemoryRouter>
    </React.StrictMode>,
  );
  console.log("ContextGuard: React mount successful");
} catch (error) {
  console.error("ContextGuard: Failed to mount React", error);
}
