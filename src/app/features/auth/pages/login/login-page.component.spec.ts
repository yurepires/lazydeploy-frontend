import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { API_CONFIG } from '../../../../core/config/api-config';
import { LoginPageComponent } from './login-page.component';

@Component({ standalone: true, template: '' })
class TestRouteComponent {}

describe('LoginPageComponent', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([
          { path: 'dashboard', component: TestRouteComponent },
          { path: 'register', component: TestRouteComponent },
          { path: 'verify-email', component: TestRouteComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { baseUrl: 'http://localhost:8080', apiPath: '/api' },
        },
      ],
    }).compileComponents();
  });

  it('requires a valid email and password before submitting', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;

    component.submit();

    expect(component.form.controls.email.hasError('required')).toBe(true);
    expect(component.form.controls.password.hasError('required')).toBe(true);
  });

  it('submits only valid credentials and navigates after login', async () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;
    const httpTesting = TestBed.inject(HttpTestingController);

    component.form.setValue({ email: 'player@example.com', password: 'secret-password' });
    component.submit();

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    expect(request.request.body).toEqual({
      email: 'player@example.com',
      password: 'secret-password',
    });
    request.flush({ id: 'user-1', email: 'player@example.com' });

    await fixture.whenStable();
    expect(component.errorMessage()).toBeNull();
    httpTesting.verify();
  });

  it('shows a friendly message for invalid credentials', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;
    const httpTesting = TestBed.inject(HttpTestingController);

    component.form.setValue({ email: 'player@example.com', password: 'wrong-password' });
    component.submit();

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    request.flush(
      { errorCode: 'INVALID_CREDENTIALS' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(component.errorMessage()).toBe('Email ou senha inválidos.');
    httpTesting.verify();
  });

  it('redirects an unverified account to the verification page', async () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;
    const httpTesting = TestBed.inject(HttpTestingController);

    component.form.setValue({ email: 'player@example.com', password: 'secret-password' });
    component.submit();

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    request.flush({ errorCode: 'EMAIL_NOT_VERIFIED' }, { status: 403, statusText: 'Forbidden' });

    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/verify-email');
    expect(sessionStorage.getItem('lazydeploy.pending-verification-email')).toBe(
      'player@example.com',
    );
    httpTesting.verify();
  });

  it('should render the login form', async () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Bem-vindo de volta',
    );
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
  });
});
