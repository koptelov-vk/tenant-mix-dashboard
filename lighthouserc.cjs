module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm preview --host 127.0.0.1 --port 4176',
      startServerReadyPattern: 'Local',
      url: ['http://127.0.0.1:4176/tenant-mix-dashboard/'],
      numberOfRuns: 3,
      settings: { chromeFlags: '--headless=new --no-sandbox --disable-gpu' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: { target: 'filesystem', outputDir: 'artifacts/lighthouse' },
  },
};
