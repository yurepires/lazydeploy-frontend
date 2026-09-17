import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { API_CONFIG } from '../../../../core/config/api-config';
import { VerifyEmailPageComponent } from './verify-email-page.component';

@Component({ standalone: true, template: '' })
class TestRouteComponent {}

describe('VerifyEmailPageComponent', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    sessionStorage.setItem('lazydeploy.pending-verification-email', 'player@example.com');

    await TestBed.configureTestingModule({
      imports: [VerifyEmailPageComponent],
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

  afterEach(() => {
    sessionStorage.clear();
  });

  it('shows the pending email and distributes a complete pasted code', () => {
    const fixture = TestBed.createComponent(VerifyEmailPageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const preventDefault = vi.fn();

    component.handlePaste({
      clipboardData: { getData: () => '04a2731-extra' },
      preventDefault,
    } as unknown as ClipboardEvent);
    fixture.detectChanges();

    expect(component.pendingEmail).toBe('player@example.com');
    expect(component.codeControl.value).toBe('042731');
    expect(component.codeDigits()).toEqual(['0', '4', '2', '7', '3', '1']);
    expect(preventDefault).toHaveBeenCalled();
    fixture.destroy();
  });

  it('confirms the code and clears the pending email', () => {
    const fixture = TestBed.createComponent(VerifyEmailPageComponent);
    const component = fixture.componentInstance;
    const httpTesting = TestBed.inject(HttpTestingController);
    component.codeControl.setValue('042731');

    component.confirm();

    const request = httpTesting.expectOne(
      'http://localhost:8080/api/auth/email-verification/confirm',
    );
    expect(request.request.body).toEqual({
      email: 'player@example.com',
      code: '042731',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(component.confirmed()).toBe(true);
    expect(sessionStorage.getItem('lazydeploy.pending-verification-email')).toBeNull();
    fixture.destroy();
    httpTesting.verify();
  });

  it('enables resend after the countdown and requests a new code', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(VerifyEmailPageComponent);
      const component = fixture.componentInstance;
      const httpTesting = TestBed.inject(HttpTestingController);

      vi.advanceTimersByTime(60_000);
      expect(component.resendCountdown()).toBe(0);
      component.resend();

      const request = httpTesting.expectOne(
        'http://localhost:8080/api/auth/email-verification/resend',
      );
      expect(request.request.body).toEqual({ email: 'player@example.com' });
      request.flush(null, { status: 202, statusText: 'Accepted' });

      expect(component.successMessage()).toContain('novo código');
      fixture.destroy();
      httpTesting.verify();
    } finally {
      vi.useRealTimers();
    }
  });
});
