import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/http/api-client.service';
import {
  SubscriptionSummary,
  UpdateSubscriptionRequest,
} from '../models/subscription-summary.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly apiClient = inject(ApiClientService);

  list(): Observable<SubscriptionSummary[]> {
    return this.apiClient.get<SubscriptionSummary[]>('/bf4/subscriptions');
  }

  getById(id: string): Observable<SubscriptionSummary> {
    return this.apiClient.get<SubscriptionSummary>(this.subscriptionPath(id));
  }

  update(id: string, request: UpdateSubscriptionRequest): Observable<SubscriptionSummary> {
    return this.apiClient.patch<SubscriptionSummary, UpdateSubscriptionRequest>(
      this.subscriptionPath(id),
      request,
    );
  }

  delete(id: string): Observable<void> {
    return this.apiClient.delete<void>(this.subscriptionPath(id));
  }

  private subscriptionPath(id: string): string {
    return `/bf4/subscriptions/${encodeURIComponent(id)}`;
  }
}
