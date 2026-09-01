import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { API_CONFIG } from '../../../../core/config/api-config';
import { RegisterPageComponent } from './register-page.component';

@Component({ standalone: true, template: '' })
class TestRouteComponent {}

describe('RegisterPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPageComponent],
      providers: [
        provideRouter([{ path: 'login', component: TestRouteComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { baseUrl: 'http://localhost:8080', apiPath: '/api' },
        },
      ],
    }).compileComponents();
  });

  it('requires matching passwords before submitting', () => {
    const fixture = TestBed.createComponent(RegisterPageComponent);
    const component = fixture.componentInstance;

    component.form.setValue({
      email: 'new-player@example.com',
      password: 'secret-password',
      confirmPassword: 'different-password',
    });
    component.submit();

    expect(component.form.hasError('passwordMismatch')).toBe(true);
  });

  it('does not send confirmPassword to the backend', async () => {
    const fixture = TestBed.createComponent(RegisterPageComponent);
    const component = fixture.componentInstance;
    const httpTesting = TestBed.inject(HttpTestingController);

    component.form.setValue({
      email: 'new-player@example.com',
      password: 'secret-password',
      confirmPassword: 'secret-password',
    });
    component.submit();

    const request = httpTesting.expectOne('http://localhost:8080/api/auth/register');
    expect(request.request.body).toEqual({
      email: 'new-player@example.com',
      password: 'secret-password',
    });
    request.flush(
      { id: 'user-2', email: 'new-player@example.com' },
      { status: 201, statusText: 'Created' },
    );

    await fixture.whenStable();
    expect(component.errorMessage()).toBeNull();
    httpTesting.verify();
  });

  it('should render the registration form', async () => {
    const fixture = TestBed.createComponent(RegisterPageComponent);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Crie seu workspace',
    );
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
  });
});
