import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Construct the service worker URL based on the current origin to avoid cross-origin issues.
    const swUrl = new URL('/service-worker.js', window.location.origin).href;
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        // ServiceWorker registration can fail in sandboxed environments like this one due to security restrictions.
        // This is an expected and benign error; the application will continue to function correctly.
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);