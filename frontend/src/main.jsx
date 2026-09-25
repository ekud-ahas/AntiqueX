import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { API_BASE_URL } from './utils/api.js'

// Attach Authorization Bearer token to all outgoing fetch requests
const originalFetch = window.fetch;
window.fetch = async (url, config = {}) => {
  const requestUrl = typeof url === 'string' && url.startsWith('/') && API_BASE_URL
    ? `${API_BASE_URL}${url}`
    : url;
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`
    };
  }
  return originalFetch(requestUrl, config);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
