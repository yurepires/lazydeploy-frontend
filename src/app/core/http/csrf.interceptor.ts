import { DOCUMENT } from '@angular/common';
import {
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';

import { ApiConfig, API_CONFIG } from '../config/api-config';
import { buildApiUrl, isApiRequest } from './api-request.utils';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let csrfTokenRequest$: Observable<string | null> | null = null;

export const csrfInterceptor: HttpInterceptorFn = (request, next) => {
  const apiConfig = inject(API_CONFIG);
  const documentRef = inject(DOCUMENT);
  const httpClient = inject(HttpClient);

  if (!isApiRequest(request, apiConfig) || !MUTATING_METHODS.has(request.method)) {
    return next(request);
  }

  const tokenFromCookie = readCsrfCookie(documentRef);
  let requestWithToken$: Observable<HttpEvent<unknown>>;

  if (tokenFromCookie) {
    requestWithToken$ = next(addCsrfHeader(request, tokenFromCookie));
  } else {
    requestWithToken$ = getCsrfTokenRequest(httpClient, apiConfig, documentRef).pipe(
      switchMap((token) => {
        if (!token) {
          return next(request);
        }

        return next(addCsrfHeader(request, token));
      }),
    );
  }

  return requestWithToken$.pipe(
    catchError((error: unknown) => {
      if (!isCsrfValidationFailure(error)) {
        return throwError(() => error);
      }

      clearCsrfCookie(documentRef);

      return getCsrfTokenRequest(httpClient, apiConfig, documentRef).pipe(
        switchMap((freshToken) => {
          if (!freshToken) {
            return throwError(() => error);
          }

          return next(addCsrfHeader(request, freshToken));
        }),
      );
    }),
  );
};

function getCsrfTokenRequest(
  httpClient: HttpClient,
  apiConfig: ApiConfig,
  documentRef: Document,
): Observable<string | null> {
  if (csrfTokenRequest$) {
    return csrfTokenRequest$;
  }

  const csrfEndpoint = buildApiUrl(apiConfig, '/auth/csrf');

  const request$ = httpClient
    .request('GET', csrfEndpoint, {
      withCredentials: true,
      responseType: 'text',
    })
    .pipe(
      map((responseToken: unknown) => {
        const tokenFromResponse = extractCsrfToken(responseToken);
        const tokenFromCookie = readCsrfCookie(documentRef);
        const token = tokenFromCookie ?? tokenFromResponse;

        console.log('CSRF Token retrieved:', token);

        if (!tokenFromCookie && token) {
          persistCsrfCookie(documentRef, token);
        }

        return token;
      }),
      finalize(() => {
        csrfTokenRequest$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  csrfTokenRequest$ = request$;

  return request$;
}

function extractCsrfToken(response: unknown): string | null {
  if (typeof response === 'string') {
    const normalizedResponse = response.trim();

    if (!normalizedResponse) {
      return null;
    }

    if (normalizedResponse.startsWith('"') && normalizedResponse.endsWith('"')) {
      try {
        const parsedResponse: unknown = JSON.parse(normalizedResponse);

        if (typeof parsedResponse === 'string' && parsedResponse.trim()) {
          return parsedResponse.trim();
        }
      } catch {
        return normalizedResponse;
      }
    }

    return normalizedResponse;
  }

  if (!response || typeof response !== 'object' || !('token' in response)) {
    return null;
  }

  const responseToken = response.token;

  if (typeof responseToken !== 'string' || !responseToken.trim()) {
    return null;
  }

  return responseToken.trim();
}

function addCsrfHeader<T>(request: HttpRequest<T>, token: string) {
  return request.clone({
    setHeaders: {
      [CSRF_HEADER_NAME]: token,
    },
  });
}

function readCsrfCookie(documentRef: Document): string | null {
  const cookie = documentRef.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  const encodedValue = cookie.slice(CSRF_COOKIE_NAME.length + 1);

  try {
    return decodeURIComponent(encodedValue);
  } catch {
    return encodedValue;
  }
}

function persistCsrfCookie(documentRef: Document, token: string): void {
  // The development proxy may not forward Set-Cookie. The token endpoint body
  // is safe to mirror because this is the JavaScript-readable CSRF cookie.
  documentRef.cookie = `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
}

function clearCsrfCookie(documentRef: Document): void {
  documentRef.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0; Path=/`;
}

function isCsrfValidationFailure(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 403) {
    return false;
  }

  const responseBody = error.error;

  if (!responseBody || typeof responseBody !== 'object') {
    return false;
  }

  const errorCode = (responseBody as { errorCode?: unknown }).errorCode;
  const code = (responseBody as { code?: unknown }).code;

  return errorCode === 'CSRF_VALIDATION_FAILED' || code === 'CSRF_VALIDATION_FAILED';
}
