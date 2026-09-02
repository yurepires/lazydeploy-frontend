import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

import { SubscriptionSummary } from '../../../dashboard/models/subscription-summary.model';

@Component({
  selector: 'app-alert-overview',
  standalone: true,
  imports: [DatePipe, MatIcon],
  templateUrl: './alert-overview.component.html',
  styleUrl: './alert-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertOverviewComponent {
  readonly subscription = input.required<SubscriptionSummary>();

  readonly statusLabel = computed(() => {
    if (this.subscription().enabled) {
      return 'Ativo';
    }

    return 'Desativado';
  });

  readonly statusIcon = computed(() => {
    if (this.subscription().enabled) {
      return 'notifications_active';
    }

    return 'notifications_off';
  });
}
