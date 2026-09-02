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
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  finalize,
  map,
  of,
  switchMap,
} from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorService } from '../../../../core/http/api-error.service';
import { AlertConditionsComponent } from '../../components/alert-conditions/alert-conditions.component';
import { AlertNotificationChannelsComponent } from '../../components/alert-notification-channels/alert-notification-channels.component';
import { AlertOverviewComponent } from '../../components/alert-overview/alert-overview.component';
import {
  DeleteAlertDialogComponent,
  DeleteAlertDialogData,
} from '../../../dashboard/components/delete-alert-dialog/delete-alert-dialog.component';
import { SubscriptionService } from '../../../dashboard/data-access/subscription.service';
import { SubscriptionSummary } from '../../../dashboard/models/subscription-summary.model';
import { mapIdsFromRule } from '../../../dashboard/utils/subscription-rule-presenter';
import { MapCatalogService } from '../../data-access/map-catalog.service';
import { BattlefieldMap } from '../../models/battlefield-map.model';

type LoadResult =
  | { readonly type: 'success'; readonly subscription: SubscriptionSummary }
  | { readonly type: 'not-found' }
  | { readonly type: 'error'; readonly message: string }
  | { readonly type: 'invalid-id' };

@Component({
  selector: 'app-alert-details-page',
  standalone: true,
  imports: [
    AlertConditionsComponent,
    AlertNotificationChannelsComponent,
    AlertOverviewComponent,
    MatButton,
    MatIcon,
    MatProgressSpinner,
    RouterLink,
  ],
  templateUrl: './alert-details-page.component.html',
  styleUrl: './alert-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertDetailsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly authService = inject(AuthService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly mapCatalogService = inject(MapCatalogService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loadRequests = new Subject<string | null>();

  readonly subscription = signal<SubscriptionSummary | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly updating = signal(false);
  readonly deleting = signal(false);
  readonly maps = signal<BattlefieldMap[]>([]);
  readonly currentSubscriptionId = signal<string | null>(null);
  readonly mapsLoading = signal(false);

  private readonly mapsLoaded = signal(false);

  readonly exists = computed(() => this.subscription() !== null);
  readonly enabled = computed(() => this.subscription()?.enabled ?? false);
  readonly accountEmail = computed(() => this.authService.currentUser()?.email ?? null);
  readonly busy = computed(() => this.updating() || this.deleting());

  readonly statusLabel = computed(() => {
    if (this.enabled()) {
      return 'Ativo';
    }

    return 'Desativado';
  });

  readonly statusIcon = computed(() => {
    if (this.enabled()) {
      return 'notifications_active';
    }

    return 'notifications_off';
  });

  readonly toggleLabel = computed(() => {
    if (this.enabled()) {
      return 'Desativar';
    }

    return 'Ativar';
  });

  readonly toggleIcon = computed(() => {
    if (this.enabled()) {
      return 'pause_circle';
    }

    return 'play_circle';
  });

  ngOnInit(): void {
    this.listenForLoadRequests();
    this.listenForRouteChanges();
  }

  retryLoad(): void {
    const subscriptionId = this.currentSubscriptionId();

    if (!subscriptionId || this.loading()) {
      return;
    }

    this.prepareForLoad();
    this.loadRequests.next(subscriptionId);
  }

  toggleSubscription(): void {
    const currentSubscription = this.subscription();

    if (!currentSubscription || this.busy()) {
      return;
    }

    const enabled = !currentSubscription.enabled;
    this.updating.set(true);

    this.subscriptionService
      .update(currentSubscription.id, { enabled })
      .pipe(
        finalize(() => this.updating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedSubscription) => {
          this.subscription.set(updatedSubscription);
          this.updatePageTitle(updatedSubscription);
          this.showSuccess(this.toggleSuccessMessage(enabled));
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  requestDelete(): void {
    const currentSubscription = this.subscription();

    if (!currentSubscription || this.busy()) {
      return;
    }

    const data: DeleteAlertDialogData = {
      serverName: currentSubscription.server.displayName,
    };
    const dialogRef = this.dialog.open(DeleteAlertDialogComponent, {
      data,
      width: 'min(92vw, 30rem)',
      panelClass: 'glass-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed === true) {
        this.deleteSubscription(currentSubscription.id);
      }
    });
  }

  preventEditWhileDeleting(event: Event): void {
    if (this.deleting()) {
      event.preventDefault();
    }
  }

  goBackToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  private listenForRouteChanges(): void {
    this.route.paramMap
      .pipe(
        map((parameters) => parameters.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((subscriptionId) => {
        this.currentSubscriptionId.set(subscriptionId);
        this.prepareForLoad();
        this.loadRequests.next(subscriptionId);
      });
  }

  private listenForLoadRequests(): void {
    this.loadRequests
      .pipe(
        switchMap((subscriptionId) => this.fetchSubscription(subscriptionId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.applyLoadResult(result));
  }

  private fetchSubscription(subscriptionId: string | null): Observable<LoadResult> {
    if (!subscriptionId || subscriptionId.trim().length === 0) {
      return of<LoadResult>({ type: 'invalid-id' });
    }

    return this.subscriptionService.getById(subscriptionId).pipe(
      map((loadedSubscription): LoadResult => ({
        type: 'success',
        subscription: loadedSubscription,
      })),
      catchError((error: unknown) => {
        const problemDetail = this.apiErrorService.toProblemDetail(error);

        if (problemDetail.status === 404) {
          return of<LoadResult>({ type: 'not-found' });
        }

        return of<LoadResult>({
          type: 'error',
          message: this.apiErrorService.messageFor(error),
        });
      }),
    );
  }

  private applyLoadResult(result: LoadResult): void {
    this.loading.set(false);

    switch (result.type) {
      case 'success':
        this.subscription.set(result.subscription);
        this.notFound.set(false);
        this.loadError.set(null);
        this.updatePageTitle(result.subscription);
        this.loadMapCatalogIfNeeded(result.subscription);
        return;
      case 'not-found':
      case 'invalid-id':
        this.subscription.set(null);
        this.notFound.set(true);
        this.loadError.set(null);
        this.title.setTitle('LazyDeploy | Alerta');
        return;
      case 'error':
        this.subscription.set(null);
        this.notFound.set(false);
        this.loadError.set(result.message);
        this.title.setTitle('LazyDeploy | Alerta');
        return;
    }
  }

  private prepareForLoad(): void {
    this.loading.set(true);
    this.subscription.set(null);
    this.loadError.set(null);
    this.notFound.set(false);
    this.title.setTitle('LazyDeploy | Alerta');
  }

  private loadMapCatalogIfNeeded(currentSubscription: SubscriptionSummary): void {
    const hasMapRule = currentSubscription.rules.some((rule) => mapIdsFromRule(rule).length > 0);

    if (!hasMapRule || this.mapsLoaded() || this.mapsLoading()) {
      return;
    }

    this.mapsLoading.set(true);

    this.mapCatalogService
      .list()
      .pipe(
        finalize(() => {
          this.mapsLoading.set(false);
          this.mapsLoaded.set(true);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (maps) => this.maps.set(maps),
        error: () => this.maps.set([]),
      });
  }

  private deleteSubscription(subscriptionId: string): void {
    if (this.deleting()) {
      return;
    }

    this.deleting.set(true);

    this.subscriptionService
      .delete(subscriptionId)
      .pipe(
        finalize(() => this.deleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.showSuccess('Alerta removido.');
          void this.router.navigate(['/dashboard']);
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  private updatePageTitle(currentSubscription: SubscriptionSummary): void {
    this.title.setTitle(`LazyDeploy | ${currentSubscription.server.displayName}`);
  }

  private toggleSuccessMessage(enabled: boolean): string {
    if (enabled) {
      return 'Alerta ativado.';
    }

    return 'Alerta desativado.';
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 3500,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }

  private showError(error: unknown): void {
    this.snackBar.open(this.apiErrorService.messageFor(error), 'Fechar', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }
}
