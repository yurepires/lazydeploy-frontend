import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_CONFIG } from '../config/api-config';
import { credentialsInterceptor } from './credentials.interceptor';
import { csrfInterceptor } from './csrf.interceptor';

describe('HTTP authentication interceptors', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let documentRef: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor, csrfInterceptor])),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { baseUrl: 'http://localhost:8080', apiPath: '/api' },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    documentRef = TestBed.inject(DOCUMENT);
    clearCsrfCookie(documentRef);
  });

  afterEach(() => {
    clearCsrfCookie(documentRef);
    httpTesting.verify();
  });

  it('includes credentials for API requests', () => {
    http.get('http://localhost:8080/api/auth/me').subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/me');
    expect(request.request.withCredentials).toBe(true);
    request.flush(null);
  });

  it('adds the CSRF header to a mutating API request', () => {
    http.post('http://localhost:8080/api/auth/login', {}).subscribe();

    const csrfRequest = httpTesting.expectOne('http://localhost:8080/api/auth/csrf');
    expect(csrfRequest.request.method).toBe('GET');
    csrfRequest.flush('csrf-token');

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(documentRef.cookie).toContain('XSRF-TOKEN=csrf-token');
    request.flush({});
  });

  it('does not add a CSRF header to a GET request', () => {
    http.get('http://localhost:8080/api/dashboard').subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/dashboard');
    expect(request.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    request.flush({});
  });

  it('refreshes a stale CSRF token once after a CSRF validation failure', () => {
    documentRef.cookie = 'XSRF-TOKEN=stale-token; Path=/';
    http.post('http://localhost:8080/api/auth/login', {}).subscribe();

    const firstRequest = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    expect(firstRequest.request.headers.get('X-XSRF-TOKEN')).toBe('stale-token');
    firstRequest.flush(
      {
        errorCode: 'CSRF_VALIDATION_FAILED',
      },
      { status: 403, statusText: 'Forbidden' },
    );

    const csrfRequest = httpTesting.expectOne('http://localhost:8080/api/auth/csrf');
    csrfRequest.flush('fresh-token');

    const retryRequest = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    expect(retryRequest.request.headers.get('X-XSRF-TOKEN')).toBe('fresh-token');
    retryRequest.flush({});
  });

  it('does not modify external requests', () => {
    http.get('https://example.com/status').subscribe();

    const request = httpTesting.expectOne('https://example.com/status');
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    request.flush({});
  });
});

function clearCsrfCookie(documentRef: Document): void {
  documentRef.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
}
