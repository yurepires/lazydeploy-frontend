import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  readonly baseUrl: string;
  readonly apiPath: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

/**
 * Intervalo único usado pelo Dashboard para atualizar o status agregado.
 */
export const DASHBOARD_STATUS_REFRESH_INTERVAL_MS = 20_000;
