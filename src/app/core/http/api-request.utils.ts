import { HttpRequest } from '@angular/common/http';

import { ApiConfig } from '../config/api-config';

export function buildApiUrl(config: ApiConfig, resourcePath: string): string {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const apiPath = config.apiPath.replace(/^\/?/, '/').replace(/\/$/, '');
  const normalizedResourcePath = resourcePath ? resourcePath.replace(/^\/?/, '/') : '';

  return `${baseUrl}${apiPath}${normalizedResourcePath}`;
}

export function isApiRequest(request: HttpRequest<unknown>, config: ApiConfig): boolean {
  const apiRoot = buildApiUrl(config, '');

  return request.url === apiRoot || request.url.startsWith(`${apiRoot}/`);
}
