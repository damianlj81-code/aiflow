import React from 'react';
import ReactDOM from 'react-dom/client';
import TextCreator from './TextCreator.jsx';
import './index.css'; // ten sam CSS co główna apka (Tailwind)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TextCreator />
  </React.StrictMode>
);
