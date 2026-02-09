import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate } from 'react-router-dom';
import { AppProvider } from './state';
import { App } from './App';
import './styles/global.css';

function Root() {
  const [redirect, setRedirect] = React.useState<string | null>(null);

  useEffect(() => {
    const redirect = sessionStorage.redirect;
    if (redirect) {
      delete sessionStorage.redirect;
      setRedirect(redirect);
    }
  }, []);

  if (redirect) {
    return <Navigate to={`/${redirect}`} replace />;
  }

  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/ai-trainer-react/">
      <Root />
    </BrowserRouter>
  </React.StrictMode>,
);
