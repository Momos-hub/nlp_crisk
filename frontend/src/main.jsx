import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './base.css';
import './styles.css';
import './workspace.css';
import './intro-fixes.css';
import './insights.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
