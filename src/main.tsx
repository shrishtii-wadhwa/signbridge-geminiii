import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filter out benign dev errors (Vite HMR disconnects, TFLite Wasm info logs)
if (typeof window !== 'undefined') {
  const isBenignDevError = (arg: unknown): boolean => {
    if (!arg) return false;
    let str = '';
    if (typeof arg === 'string') {
      str = arg;
    } else if (arg && typeof arg === 'object') {
      const err = arg as any;
      str = `${err.message || ''} ${err.stack || ''} ${err.reason || ''} ${err.toString ? err.toString() : ''}`;
    }
    return (
      str.includes('WebSocket closed without opened') ||
      str.includes('failed to connect to websocket') ||
      str.includes('WebSocket connection to') ||
      str.includes('[vite] failed to connect') ||
      str.includes('[vite] server connection lost') ||
      (str.includes('[vite]') && (str.includes('websocket') || str.includes('WebSocket') || str.includes('connection'))) ||
      str.includes('TensorFlow Lite') ||
      str.includes('XNNPACK') ||
      str.includes('Created TensorFlow Lite XNNPACK delegate')
    );
  };

  const origError = console.error;
  console.error = (...args: any[]) => {
    if (args.some(isBenignDevError)) {
      console.debug(...args);
      return;
    }
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (args.some(isBenignDevError)) {
      console.debug(...args);
      return;
    }
    origWarn.apply(console, args);
  };

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      if (isBenignDevError(reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'error',
    (event) => {
      const msg = event.message || (event.error && (event.error.message || event.error.stack)) || '';
      if (isBenignDevError(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

