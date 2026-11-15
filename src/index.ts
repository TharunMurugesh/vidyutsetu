/**
 * Cloudflare Workers edge function for VidyutSetu
 * Proxies API requests to backend, serves frontend static assets
 */

export interface Env {
  BACKEND_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Proxy API requests to backend
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = new URL(url.pathname + url.search, env.BACKEND_URL);

      return fetch(new Request(backendUrl, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'Origin': env.BACKEND_URL,
        },
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      }));
    }

    // All other requests fall through to Pages (frontend)
    return fetch(request);
  },
} satisfies ExportedHandler<Env>;
