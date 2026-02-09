import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './state';
import { App } from './App';
import './styles/global.css';

const basename = ((import.meta as unknown) as { env: { BASE_URL: string } }).env.BASE_URL || '/ai-trainer-react/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
