import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { ApiErrorService } from '../../../../core/http/api-error.service';
import {
  NotificationHistoryListQuery,
  NotificationHistoryService,
} from '../../data-access/notification-history.service';
import { NotificationHistoryItem } from '../../models/notification-history-item.model';
import { PagedResponse } from '../../models/paged-response.model';
import { NotificationHistoryItemComponent } from '../../components/notification-history-item/notification-history-item.component';

const HISTORY_PAGE_SIZE = 20;
const STATUS_VALUES = new Set(['SUCCESS', 'FAILED']);

interface HistoryQueryState {
  readonly page: number;
  readonly status: string | null;
  readonly channel: string | null;
  readonly subscriptionId: string | null;
}

type LoadResult =
  | { readonly type: 'success'; readonly response: PagedResponse<NotificationHistoryItem> }
  | { readonly type: 'error'; readonly message: string };

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [
    MatButton,
    MatFormField,
    MatIcon,
    MatLabel,
    MatOption,
    MatSelect,
    NotificationHistoryItemComponent,
    RouterLink,
  ],
  templateUrl: './history-page.component.html',
  styleUrl: './history-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly historyService = inject(NotificationHistoryService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loadRequests = new Subject<HistoryQueryState>();

  readonly items = signal<NotificationHistoryItem[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly page = signal(0);
  readonly pageSize = signal(HISTORY_PAGE_SIZE);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly statusFilter = signal<string | null>(null);
  readonly channelFilter = signal<string | null>(null);
  readonly subscriptionIdFilter = signal<string | null>(null);

  readonly hasNextPage = computed(() => this.page() + 1 < this.totalPages());
  readonly hasPreviousPage = computed(() => this.page() > 0);
  readonly isFiltered = computed(
    () =>
      this.statusFilter() !== null ||
      this.channelFilter() !== null ||
      this.subscriptionIdFilter() !== null,
  );
  readonly isEmpty = computed(
    () => !this.loading() && !this.loadError() && this.items().length === 0,
  );
  readonly pageLabel = computed(() => {
    if (this.totalPages() === 0) {
      return 'Nenhuma página';
    }

    return `Página ${this.page() + 1} de ${this.totalPages()}`;
  });

  readonly loadingPlaceholders = [1, 2, 3];

  ngOnInit(): void {
    this.listenForLoadRequests();
    this.listenForQueryChanges();
  }

  retryLoad(): void {
    if (!this.loading()) {
      this.loadRequests.next(this.currentQueryState());
    }
  }

  onStatusChanged(status: string): void {
    this.navigateWithFilters({ status: normalizeStatus(status), page: 0 });
  }

  onChannelChanged(channel: string): void {
    this.navigateWithFilters({ channel: normalizeChannel(channel), page: 0 });
  }

  clearFilters(): void {
    this.navigateWithFilters({
      status: null,
      channel: null,
      subscriptionId: null,
      page: 0,
    });
  }

  goToNextPage(): void {
    if (this.hasNextPage()) {
      this.navigateWithFilters({ page: this.page() + 1 });
    }
  }

  goToPreviousPage(): void {
    if (this.hasPreviousPage()) {
      this.navigateWithFilters({ page: this.page() - 1 });
    }
  }

  private listenForQueryChanges(): void {
    this.route.queryParamMap
      .pipe(
        map((parameters) => this.toQueryState(parameters)),
        distinctUntilChanged((first, second) => areQueryStatesEqual(first, second)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        this.applyQueryState(state);
        this.loadRequests.next(state);
      });
  }

  private listenForLoadRequests(): void {
    this.loadRequests
      .pipe(
        switchMap((state) => this.fetchPage(state)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.applyLoadResult(result));
  }

  private fetchPage(state: HistoryQueryState): Observable<LoadResult> {
    this.loading.set(true);
    this.loadError.set(null);

    const query: NotificationHistoryListQuery = {
      page: state.page,
      size: this.pageSize(),
      status: state.status,
      channel: state.channel,
      subscriptionId: state.subscriptionId,
    };

    return this.historyService.list(query).pipe(
      map((response) => ({ type: 'success', response }) as LoadResult),
      catchError((error: unknown) =>
        of<LoadResult>({
          type: 'error',
          message: this.apiErrorService.messageFor(error),
        }),
      ),
    );
  }

  private applyLoadResult(result: LoadResult): void {
    this.loading.set(false);

    if (result.type === 'error') {
      this.items.set([]);
      this.totalElements.set(0);
      this.totalPages.set(0);
      this.loadError.set(result.message);
      return;
    }

    this.items.set(result.response.content);
    this.page.set(result.response.page);
    this.pageSize.set(result.response.size || HISTORY_PAGE_SIZE);
    this.totalElements.set(result.response.totalElements);
    this.totalPages.set(result.response.totalPages);
    this.loadError.set(null);
  }

  private toQueryState(parameters: ParamMap): HistoryQueryState {
    return {
      page: parsePage(parameters.get('page')),
      status: normalizeStatus(parameters.get('status')),
      channel: normalizeChannel(parameters.get('channel')),
      subscriptionId: normalizeSubscriptionId(parameters.get('subscriptionId')),
    };
  }

  private applyQueryState(state: HistoryQueryState): void {
    this.page.set(state.page);
    this.statusFilter.set(state.status);
    this.channelFilter.set(state.channel);
    this.subscriptionIdFilter.set(state.subscriptionId);
  }

  private currentQueryState(): HistoryQueryState {
    return {
      page: this.page(),
      status: this.statusFilter(),
      channel: this.channelFilter(),
      subscriptionId: this.subscriptionIdFilter(),
    };
  }

  private navigateWithFilters(changes: Partial<HistoryQueryState>): void {
    const current = this.currentQueryState();
    const next = { ...current, ...changes };
    const queryParams: Params = {
      page: next.page > 0 ? next.page : null,
      status: next.status,
      channel: next.channel,
      subscriptionId: next.subscriptionId,
    };

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) {
    return 0;
  }

  const parsedPage = Number(value);

  if (!Number.isSafeInteger(parsedPage) || parsedPage < 0) {
    return 0;
  }

  return parsedPage;
}

function normalizeStatus(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim().toUpperCase() ?? '';

  return STATUS_VALUES.has(normalizedValue) ? normalizedValue : null;
}

function normalizeChannel(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim().toUpperCase() ?? '';

  return normalizedValue === 'EMAIL' ? 'EMAIL' : null;
}

function normalizeSubscriptionId(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim() ?? '';

  if (!normalizedValue || !isUuid(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function areQueryStatesEqual(first: HistoryQueryState, second: HistoryQueryState): boolean {
  return (
    first.page === second.page &&
    first.status === second.status &&
    first.channel === second.channel &&
    first.subscriptionId === second.subscriptionId
  );
}
