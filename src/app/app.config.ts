import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import { API_CONFIG } from './core/config/api-config';
import { credentialsInterceptor } from './core/http/credentials.interceptor';
import { csrfInterceptor } from './core/http/csrf.interceptor';
import { unauthorizedInterceptor } from './core/http/unauthorized.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([credentialsInterceptor, csrfInterceptor, unauthorizedInterceptor]),
    ),
    provideRouter(routes),
    {
      provide: API_CONFIG,
      useValue: {
        baseUrl: environment.apiBaseUrl,
        apiPath: environment.apiPath,
      },
    },
  ],
};
