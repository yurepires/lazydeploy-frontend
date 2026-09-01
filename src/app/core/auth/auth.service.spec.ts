import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';

import { API_CONFIG } from '../config/api-config';
import { CurrentUser } from '../../shared/models/current-user.model';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: Router,
          useValue: { navigate: () => Promise.resolve(true) },
        },
        {
          provide: API_CONFIG,
          useValue: { baseUrl: 'http://localhost:8080', apiPath: '/api' },
        },
      ],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads the current user and updates the authentication state', () => {
    let currentUser: CurrentUser | null | undefined;

    service.loadCurrentUser().subscribe((user) => {
      currentUser = user;
    });

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/me');
    expect(request.request.method).toBe('GET');

    request.flush({ id: 'user-1', email: 'player@example.com' });

    expect(currentUser).toEqual({ id: 'user-1', email: 'player@example.com' });
    expect(service.currentUser()).toEqual({ id: 'user-1', email: 'player@example.com' });
    expect(service.authenticated()).toBe(true);
    expect(service.initialized()).toBe(true);
  });

  it('treats a 401 from the current-user endpoint as an unauthenticated visitor', () => {
    let currentUser: CurrentUser | null | undefined;

    service.loadCurrentUser().subscribe((user) => {
      currentUser = user;
    });

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/me');
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(currentUser).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.authenticated()).toBe(false);
    expect(service.initialized()).toBe(true);
  });

  it('logs in and stores only the returned current-user data', () => {
    let currentUser: CurrentUser | undefined;

    service
      .login({ email: 'player@example.com', password: 'secret-password' })
      .subscribe((user) => {
        currentUser = user;
      });

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    expect(request.request.body).toEqual({
      email: 'player@example.com',
      password: 'secret-password',
    });

    request.flush({ id: 'user-1', email: 'player@example.com' });

    expect(currentUser).toEqual({ id: 'user-1', email: 'player@example.com' });
    expect(service.currentUser()).toEqual({ id: 'user-1', email: 'player@example.com' });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('registers a user without changing the current session state', () => {
    service.register({ email: 'new-player@example.com', password: 'secret-password' }).subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/register');
    expect(request.request.body).toEqual({
      email: 'new-player@example.com',
      password: 'secret-password',
    });

    request.flush({ id: 'user-2', email: 'new-player@example.com' });

    expect(service.currentUser()).toBeNull();
  });

  it('logs out through the backend and clears the current user', () => {
    service.login({ email: 'player@example.com', password: 'secret-password' }).subscribe();
    httpTesting.expectOne('http://localhost:8080/api/auth/login').flush({
      id: 'user-1',
      email: 'player@example.com',
    });

    service.logout().subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/logout');
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.currentUser()).toBeNull();
    expect(service.authenticated()).toBe(false);
  });
});
