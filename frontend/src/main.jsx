import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// 👇 1. Import the Analytics component
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {/* 👇 2. Add it right below your App */}
    <Analytics />
  </React.StrictMode>
);