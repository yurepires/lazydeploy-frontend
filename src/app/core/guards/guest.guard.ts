import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';

import { AuthService } from '../auth/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.initialized()) {
    return authService.loadCurrentUser().pipe(map(() => guestOrDashboard(authService, router)));
  }

  return guestOrDashboard(authService, router);
};

function guestOrDashboard(authService: AuthService, router: Router) {
  if (authService.authenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
}
