export const environment = {
  production: true,
  // The production API is proxied by the Cloudflare Pages Function at /api.
  // Keeping the browser on the frontend origin makes the session and CSRF
  // cookies first-party, including on iOS browsers.
  apiBaseUrl: '',
  apiPath: '/api',
} as const;
