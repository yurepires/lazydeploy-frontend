import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, isObservable, of } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { authGuard, rootRedirectGuard } from './auth.guard';
import { guestGuard } from './guest.guard';

describe('authentication guards', () => {
  it('allows an authenticated user to access protected routes', () => {
    configureAuthState(true, true);

    const result = invoke(authGuard);

    expect(result).toBe(true);
  });

  it('redirects a visitor to login for protected routes', () => {
    configureAuthState(true, false);

    const result = invoke(authGuard);

    expect(serializeUrl(result as GuardResult)).toBe('/login');
  });

  it('allows a visitor to access login and register routes', () => {
    configureAuthState(true, false);

    expect(invoke(guestGuard)).toBe(true);
  });

  it('redirects an authenticated user away from public routes', () => {
    configureAuthState(true, true);

    expect(serializeUrl(invoke(guestGuard) as GuardResult)).toBe('/dashboard');
  });

  it('waits for the first session check before deciding the root destination', async () => {
    configureAuthState(false, false);

    const result = invoke(rootRedirectGuard);

    expect(result).toEqual(expect.anything());
    if (!isObservable(result)) {
      throw new Error('The root guard should wait for the current-user request.');
    }

    await new Promise<void>((resolve, reject) => {
      (result as Observable<GuardResult>).subscribe({
        next: (destination: GuardResult) => {
          expect(serializeUrl(destination)).toBe('/login');
          resolve();
        },
        error: reject,
      });
    });
  });
});

function configureAuthState(initialized: boolean, authenticated: boolean): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          initialized: signal(initialized),
          authenticated: signal(authenticated),
          loadCurrentUser: () => of(null),
        },
      },
    ],
  });
}

type GuardResult = boolean | UrlTree;

function invoke(
  guard: typeof authGuard | typeof guestGuard | typeof rootRedirectGuard,
): GuardResult | Observable<GuardResult> {
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as GuardResult | Observable<GuardResult>;
}

function serializeUrl(result: GuardResult): string {
  if (result === true || result === false) {
    return String(result);
  }

  return TestBed.inject(Router).serializeUrl(result as UrlTree);
}
