import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';

import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.initialized()) {
    return authService.loadCurrentUser().pipe(map(() => authenticatedOrLogin(authService, router)));
  }

  return authenticatedOrLogin(authService, router);
};

export const rootRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.initialized()) {
    return authService.loadCurrentUser().pipe(map(() => rootDestination(authService, router)));
  }

  return rootDestination(authService, router);
};

function authenticatedOrLogin(authService: AuthService, router: Router) {
  if (authService.authenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
}

function rootDestination(authService: AuthService, router: Router) {
  if (authService.authenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  return router.createUrlTree(['/login']);
}
