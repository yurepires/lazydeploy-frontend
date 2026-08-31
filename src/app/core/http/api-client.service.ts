import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api-config';

export interface ApiRequestOptions {
  readonly params?: HttpParams;
}

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);

  get<TResponse>(resourcePath: string, options?: ApiRequestOptions): Observable<TResponse> {
    return this.http.get<TResponse>(this.buildUrl(resourcePath), options);
  }

  private buildUrl(resourcePath: string): string {
    const baseUrl = this.apiConfig.baseUrl.replace(/\/$/, '');
    const apiPath = this.apiConfig.apiPath.replace(/^\/?/, '/').replace(/\/$/, '');
    const normalizedResourcePath = resourcePath.replace(/^\/?/, '/');

    return `${baseUrl}${apiPath}${normalizedResourcePath}`;
  }
}
