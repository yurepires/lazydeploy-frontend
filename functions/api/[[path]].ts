const BACKEND_ORIGIN = 'https://lazydeploy-backend-production.up.railway.app';

const BODYLESS_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

interface PagesFunctionContext {
  request: Request;
}

export async function onRequest(
  context: PagesFunctionContext,
): Promise<Response> {
  const targetUrl = buildBackendUrl(context.request);
  const requestHeaders = createForwardHeaders(context.request.headers);

  const backendResponse = await fetch(targetUrl, {
    method: context.request.method,
    headers: requestHeaders,
    body: BODYLESS_METHODS.has(context.request.method)
      ? undefined
      : context.request.body,
    redirect: 'manual',
  });

  return createClientResponse(backendResponse);
}

function buildBackendUrl(request: Request): string {
  const incomingUrl = new URL(request.url);
  const backendUrl = new URL(BACKEND_ORIGIN);

  backendUrl.pathname = incomingUrl.pathname;
  backendUrl.search = incomingUrl.search;

  return backendUrl.toString();
}

function createForwardHeaders(incomingHeaders: Headers): Headers {
  const headers = new Headers(incomingHeaders);

  headers.delete('Host');
  headers.delete('Content-Length');

  return headers;
}

function createClientResponse(backendResponse: Response): Response {
  const responseHeaders = new Headers(backendResponse.headers);
  const setCookieHeaders = readSetCookieHeaders(backendResponse.headers);

  if (setCookieHeaders.length > 0) {
    responseHeaders.delete('Set-Cookie');
    for (const setCookieHeader of setCookieHeaders) {
      responseHeaders.append('Set-Cookie', setCookieHeader);
    }
  }

  // Authentication and CSRF responses must never be cached by the edge.
  responseHeaders.set('Cache-Control', 'no-store');

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

function readSetCookieHeaders(headers: Headers): string[] {
  const headersWithCookieSupport = headers as Headers & {
    getSetCookie?: () => string[];
  };

  return headersWithCookieSupport.getSetCookie?.() ?? [];
}
