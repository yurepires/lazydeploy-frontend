import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/http/api-client.service';
import {
  ConfiguredSubscriptionResponse,
  ConfigureSubscriptionRequest,
} from '../../alerts/models/configure-subscription-request.model';
import {
  RuleSummary,
  SubscriptionSummary,
  UpdateRuleRequest,
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

  updateRule(
    subscriptionId: string,
    ruleId: string,
    request: UpdateRuleRequest,
  ): Observable<RuleSummary> {
    const rulePath = `${this.subscriptionPath(subscriptionId)}/rules/${encodeURIComponent(ruleId)}`;

    return this.apiClient.patch<RuleSummary, UpdateRuleRequest>(rulePath, request);
  }

  delete(id: string): Observable<void> {
    return this.apiClient.delete<void>(this.subscriptionPath(id));
  }

  configure(request: ConfigureSubscriptionRequest): Observable<ConfiguredSubscriptionResponse> {
    return this.apiClient.post<ConfiguredSubscriptionResponse, ConfigureSubscriptionRequest>(
      '/bf4/subscriptions/configure',
      request,
    );
  }

  private subscriptionPath(id: string): string {
    return `/bf4/subscriptions/${encodeURIComponent(id)}`;
  }
}
