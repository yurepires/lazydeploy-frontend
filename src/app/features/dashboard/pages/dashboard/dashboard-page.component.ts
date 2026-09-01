import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiErrorService } from '../../../../core/http/api-error.service';
import { AlertCardComponent } from '../../components/alert-card/alert-card.component';
import {
  DeleteAlertDialogComponent,
  DeleteAlertDialogData,
} from '../../components/delete-alert-dialog/delete-alert-dialog.component';
import { SubscriptionService } from '../../data-access/subscription.service';
import { SubscriptionSummary } from '../../models/subscription-summary.model';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [AlertCardComponent, MatButton, MatIcon, RouterLink],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly subscriptions = signal<SubscriptionSummary[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly updatingIds = signal<Set<string>>(new Set());
  readonly deletingIds = signal<Set<string>>(new Set());

  readonly hasSubscriptions = computed(() => this.subscriptions().length > 0);
  readonly isEmpty = computed(
    () => !this.loading() && !this.loadError() && this.subscriptions().length === 0,
  );
  readonly activeSubscriptionCount = computed(
    () => this.subscriptions().filter((subscription) => subscription.enabled).length,
  );
  readonly monitoredServerCount = computed(
    () => new Set(this.subscriptions().map((subscription) => subscription.server.guid)).size,
  );
  readonly activeChannelCount = computed(() =>
    this.subscriptions().reduce(
      (total, subscription) =>
        total + subscription.channels.filter((channel) => channel.enabled).length,
      0,
    ),
  );
  readonly alertCountLabel = computed(() => {
    if (this.subscriptions().length === 1) {
      return 'alerta';
    }

    return 'alertas';
  });
  readonly loadingPlaceholders = [1, 2, 3];

  ngOnInit(): void {
    this.loadSubscriptions();
  }

  loadSubscriptions(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.subscriptionService
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (subscriptions) => this.subscriptions.set(subscriptions),
        error: (error: unknown) => this.loadError.set(this.apiErrorService.messageFor(error)),
      });
  }

  isUpdating(subscriptionId: string): boolean {
    return this.updatingIds().has(subscriptionId);
  }

  isDeleting(subscriptionId: string): boolean {
    return this.deletingIds().has(subscriptionId);
  }

  toggleSubscription(subscription: SubscriptionSummary): void {
    if (this.isBusy(subscription.id)) {
      return;
    }

    const enabled = !subscription.enabled;
    this.setOperationState(this.updatingIds, subscription.id, true);

    this.subscriptionService
      .update(subscription.id, { enabled })
      .pipe(finalize(() => this.setOperationState(this.updatingIds, subscription.id, false)))
      .subscribe({
        next: (updatedSubscription) => {
          this.replaceSubscription(updatedSubscription);
          this.showSuccess(this.toggleSuccessMessage(enabled));
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  requestDelete(subscription: SubscriptionSummary): void {
    if (this.isBusy(subscription.id)) {
      return;
    }

    const data: DeleteAlertDialogData = {
      serverName: subscription.server.displayName,
    };
    const dialogRef = this.dialog.open(DeleteAlertDialogComponent, {
      data,
      width: 'min(92vw, 30rem)',
      panelClass: 'glass-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed === true) {
        this.deleteSubscription(subscription);
      }
    });
  }

  private deleteSubscription(subscription: SubscriptionSummary): void {
    if (this.isBusy(subscription.id)) {
      return;
    }

    this.setOperationState(this.deletingIds, subscription.id, true);

    this.subscriptionService
      .delete(subscription.id)
      .pipe(finalize(() => this.setOperationState(this.deletingIds, subscription.id, false)))
      .subscribe({
        next: () => {
          this.subscriptions.update((currentSubscriptions) =>
            currentSubscriptions.filter((item) => item.id !== subscription.id),
          );
          this.showSuccess('Alerta removido.');
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  private isBusy(subscriptionId: string): boolean {
    return this.isUpdating(subscriptionId) || this.isDeleting(subscriptionId);
  }

  private replaceSubscription(updatedSubscription: SubscriptionSummary): void {
    this.subscriptions.update((currentSubscriptions) =>
      currentSubscriptions.map((subscription) =>
        subscription.id === updatedSubscription.id ? updatedSubscription : subscription,
      ),
    );
  }

  private setOperationState(
    operationIds: WritableSignal<Set<string>>,
    subscriptionId: string,
    active: boolean,
  ): void {
    operationIds.update((currentIds) => {
      const nextIds = new Set(currentIds);

      if (active) {
        nextIds.add(subscriptionId);
      } else {
        nextIds.delete(subscriptionId);
      }

      return nextIds;
    });
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
