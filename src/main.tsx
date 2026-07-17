import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './TenantMixApp';
import './styles/globals.css';
import './styles/accessibility.css';
import './styles/mall-sheet.css';
import './styles/saved-views.css';
import './styles/pdf-export.css';
import './styles/qa-fixes.css';
import './styles/tooltip.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60_000, retry: 1 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
