import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { API_CONFIG } from '../config/api-config';
import { unauthorizedInterceptor } from './unauthorized.interceptor';

describe('unauthorizedInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let clearCurrentUser: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearCurrentUser = vi.fn();
    navigate = vi.fn(() => Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { baseUrl: 'http://localhost:8080', apiPath: '/api' },
        },
        {
          provide: Router,
          useValue: { url: '/dashboard', navigate },
        },
        {
          provide: AuthService,
          useValue: { clearCurrentUser },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('clears the session and redirects when a protected request returns 401', () => {
    http.get('http://localhost:8080/api/dashboard').subscribe({ error: () => undefined });

    const request = httpTesting.expectOne('http://localhost:8080/api/dashboard');
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(clearCurrentUser).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard' },
    });
  });

  it('does not redirect when login itself returns invalid credentials', () => {
    http.post('http://localhost:8080/api/auth/login', {}).subscribe({ error: () => undefined });

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(clearCurrentUser).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not redirect when the current-user bootstrap request returns 401', () => {
    http.get('http://localhost:8080/api/auth/me').subscribe({ error: () => undefined });

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/me');
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(clearCurrentUser).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
