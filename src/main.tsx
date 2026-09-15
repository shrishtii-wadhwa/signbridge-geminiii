import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filter out Emscripten/Wasm stdout/stderr messages that route TFLite INFO logs through console.error
if (typeof window !== 'undefined') {
  const isTfLiteLog = (arg: unknown): boolean => {
    if (!arg) return false;
    const str = typeof arg === 'string' ? arg : (arg as any)?.message || String(arg);
    return (
      str.includes('TensorFlow Lite') ||
      str.includes('XNNPACK') ||
      str.includes('Created TensorFlow Lite XNNPACK delegate')
    );
  };

  const origError = console.error;
  console.error = (...args: any[]) => {
    if (args.some(isTfLiteLog)) {
      console.info(...args);
      return;
    }
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (args.some(isTfLiteLog)) {
      console.info(...args);
      return;
    }
    origWarn.apply(console, args);
  };

  window.addEventListener(
    'error',
    (event) => {
      const msg = event.message || (event.error && event.error.message) || '';
      if (isTfLiteLog(msg)) {
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

