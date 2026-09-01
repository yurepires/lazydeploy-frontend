import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { API_CONFIG } from '../config/api-config';
import { isApiRequest } from './api-request.utils';

export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  const apiConfig = inject(API_CONFIG);

  if (!isApiRequest(request, apiConfig)) {
    return next(request);
  }

  return next(request.clone({ withCredentials: true }));
};
