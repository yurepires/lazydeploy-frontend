import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { CurrentServerStatusComponent } from '../../../../shared/components/current-server-status/current-server-status.component';
import { SubscriptionSummary } from '../../models/subscription-summary.model';
import {
  ChannelPresentation,
  RulePresentation,
  presentChannel,
  presentRule,
} from '../../utils/subscription-rule-presenter';

@Component({
  selector: 'app-alert-card',
  standalone: true,
  imports: [CurrentServerStatusComponent, MatButton, MatIcon, MatIconButton, RouterLink],
  templateUrl: './alert-card.component.html',
  styleUrl: './alert-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertCardComponent {
  readonly subscription = input.required<SubscriptionSummary>();
  readonly updating = input(false);
  readonly deleting = input(false);

  readonly toggleEnabled = output<void>();
  readonly deleteRequested = output<void>();

  readonly isBusy = computed(() => this.updating() || this.deleting());
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
  readonly toggleActionLabel = computed(() => {
    if (this.subscription().enabled) {
      return 'Desativar alerta';
    }

    return 'Ativar alerta';
  });
  readonly presentedRules = computed<RulePresentation[]>(() =>
    this.subscription()
      .rules.filter((rule) => rule.enabled)
      .map(presentRule),
  );
  readonly presentedChannels = computed<ChannelPresentation[]>(() =>
    this.subscription()
      .channels.filter((channel) => channel.enabled)
      .map(presentChannel),
  );

  emitToggle(): void {
    if (this.isBusy()) {
      return;
    }

    this.toggleEnabled.emit();
  }

  emitDelete(): void {
    if (this.isBusy()) {
      return;
    }

    this.deleteRequested.emit();
  }
}
