import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './TenantMixApp';
import { OverlayControllerProvider } from './components/ui/OverlayController';
import './styles/globals.css';
import './styles/accessibility.css';
import './styles/mall-sheet.css';
import './styles/saved-views.css';
import './styles/pdf-export.css';
import './styles/qa-fixes.css';
import './styles/tooltip.css';
import './styles/overlay-controller.css';
import './styles/category-heatmap.css';
import './styles/comparison-field.css';
import './styles/package3-table-ux.css';
import './styles/package3-final.css';
import './styles/package4-methodology.css';
import './styles/category-profile.css';
import './styles/category-profile-quality.css';
import './styles/export-actions.css';
import './styles/upcoming-table-responsive.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60_000, retry: 1 },
  },
});

function startBuildWatcher() {
  if (!window.location.hostname.endsWith('github.io')) return;

  const basePath = '/tenant-mix-dashboard/';
  let activeBuild: string | null = null;
  let navigating = false;

  const navigateWithCacheBust = (build?: string) => {
    if (navigating) return;
    navigating = true;
    const url = new URL(basePath, window.location.origin);
    url.searchParams.set(build ? 'build' : 'deployment', build ?? Date.now().toString());
    window.location.replace(url.toString());
  };

  const checkBuild = async () => {
    try {
      const response = await fetch(`${basePath}build-info.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
      });

      if (!response.ok) {
        if (activeBuild) navigateWithCacheBust();
        return;
      }

      const info = await response.json() as { status?: string; build?: string };
      if (info.status !== 'production' || !info.build) {
        if (activeBuild) navigateWithCacheBust();
        return;
      }

      if (!activeBuild) {
        activeBuild = info.build;
        return;
      }

      if (info.build !== activeBuild) navigateWithCacheBust(info.build);
    } catch {
      if (activeBuild) navigateWithCacheBust();
    }
  };

  void checkBuild();
  window.setInterval(() => void checkBuild(), 8000);
}

startBuildWatcher();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <OverlayControllerProvider><App /></OverlayControllerProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
