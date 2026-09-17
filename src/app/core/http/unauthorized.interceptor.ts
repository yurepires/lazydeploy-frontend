import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { ApiConfig, API_CONFIG } from '../config/api-config';
import { isApiRequest } from './api-request.utils';

export const unauthorizedInterceptor: HttpInterceptorFn = (request, next) => {
  const apiConfig = inject(API_CONFIG);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (shouldRedirectToLogin(request, error, apiConfig, router)) {
        authService.clearCurrentUser();
        void router.navigate(['/login'], {
          queryParams: { returnUrl: router.url },
        });
      }

      return throwError(() => error);
    }),
  );
};

function shouldRedirectToLogin(
  request: import('@angular/common/http').HttpRequest<unknown>,
  error: unknown,
  apiConfig: ApiConfig,
  router: Router,
): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
    return false;
  }

  if (!isApiRequest(request, apiConfig) || router.url.startsWith('/login')) {
    return false;
  }

  const requestPath = request.url.split('?')[0];

  return ![
    '/auth/me',
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/password-recovery/request',
    '/auth/password-recovery/verify',
    '/auth/password-recovery/complete',
  ].some((path) =>
    requestPath.endsWith(path),
  );
}
