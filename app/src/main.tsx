import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { queryClient } from '@/lib/queryClient';
import { routes } from '@/routes';
import '@/styles/global.css';

// Transparently proxy Google Translate / Romanization calls through our local /api/yt-proxy to bypass browser CORS restrictions
const originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input instanceof Request ? input.url : '';
  if (url.includes('translate.googleapis.com')) {
    const proxiedUrl = `/api/yt-proxy?url=${encodeURIComponent(url)}`;
    if (input instanceof Request) {
      return originalFetch(new Request(proxiedUrl, input), init);
    }
    return originalFetch(proxiedUrl, init);
  }
  return originalFetch(input, init);
};

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
