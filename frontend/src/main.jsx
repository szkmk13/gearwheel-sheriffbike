import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/styles.css';
import './styles/sections.css';
import HomePage from './pages/HomePage.jsx';

createRoot(document.getElementById('root')).render(<HomePage />);
