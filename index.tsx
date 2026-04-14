import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

if (import.meta.env.DEV) {
  void navigator.serviceWorker
    ?.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch((error) => {
      console.warn('Failed to clear service workers during local dev', error);
    });
} else {
  registerSW({ immediate: true });
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
