import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/http/api-client.service';
import {
  NotificationHistoryDetails,
  NotificationHistoryItem,
} from '../models/notification-history-item.model';
import { PagedResponse } from '../models/paged-response.model';

export interface NotificationHistoryListQuery {
  readonly page: number;
  readonly size: number;
  readonly status?: string | null;
  readonly channel?: string | null;
  readonly subscriptionId?: string | null;
}

export interface SubscriptionNotificationHistoryQuery {
  readonly page: number;
  readonly size: number;
  readonly status?: string | null;
  readonly channel?: string | null;
}

const DEFAULT_HISTORY_PAGE = 0;
const DEFAULT_HISTORY_PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class NotificationHistoryService {
  private readonly apiClient = inject(ApiClientService);

  list(
    query: NotificationHistoryListQuery = {
      page: DEFAULT_HISTORY_PAGE,
      size: DEFAULT_HISTORY_PAGE_SIZE,
    },
  ): Observable<PagedResponse<NotificationHistoryItem>> {
    return this.apiClient.get<PagedResponse<NotificationHistoryItem>>('/bf4/notifications', {
      params: this.toPageParams(query),
    });
  }

  getById(notificationId: string): Observable<NotificationHistoryDetails> {
    const encodedId = encodeURIComponent(notificationId);

    return this.apiClient.get<NotificationHistoryDetails>(`/bf4/notifications/${encodedId}`);
  }

  listBySubscription(
    subscriptionId: string,
    query: SubscriptionNotificationHistoryQuery = {
      page: DEFAULT_HISTORY_PAGE,
      size: DEFAULT_HISTORY_PAGE_SIZE,
    },
  ): Observable<PagedResponse<NotificationHistoryItem>> {
    const encodedId = encodeURIComponent(subscriptionId);

    return this.apiClient.get<PagedResponse<NotificationHistoryItem>>(
      `/bf4/subscriptions/${encodedId}/notifications`,
      { params: this.toPageParams(query) },
    );
  }

  private toPageParams(query: {
    readonly page: number;
    readonly size: number;
    readonly status?: string | null;
    readonly channel?: string | null;
    readonly subscriptionId?: string | null;
  }): HttpParams {
    let params = new HttpParams().set('page', query.page).set('size', query.size);

    if (query.status) {
      params = params.set('status', query.status);
    }

    if (query.channel) {
      params = params.set('channel', query.channel);
    }

    if (query.subscriptionId) {
      params = params.set('subscriptionId', query.subscriptionId);
    }

    return params;
  }
}
