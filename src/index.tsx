import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, 
      gcTime: 1000 * 60 * 5, 
      refetchOnWindowFocus: true, 
      retry: 1, 
    },
  },
});

// Global Error Handler for "White Screen" debugging
window.addEventListener('error', (event) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.backgroundColor = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.innerText = `Runtime Error: ${event.message}\nAt: ${event.filename}:${event.lineno}:${event.colno}\nStack: ${event.error?.stack}`;
  document.body.appendChild(errorDiv);
});

window.addEventListener('unhandledrejection', (event) => {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '0';
    errorDiv.style.width = '100%';
    errorDiv.style.backgroundColor = 'darkred';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '20px';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.whiteSpace = 'pre-wrap';
    errorDiv.innerText = `Unhandled Promise Rejection: ${event.reason}`;
    document.body.appendChild(errorDiv);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </React.StrictMode>
    );
} catch (e: any) {
    document.body.innerHTML = `<div style="color:red; padding: 20px;"><h1>Mount Error</h1><pre>${e.toString()}\n${e.stack}</pre></div>`;
}
