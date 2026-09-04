import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { NotificationHistoryItem } from '../../models/notification-history-item.model';
import { presentNotificationChannel } from '../../utils/notification-channel-presenter';
import { formatNotificationDate } from '../../utils/notification-date-presenter';
import { presentNotificationStatus } from '../../utils/notification-status-presenter';

@Component({
  selector: 'app-notification-history-item',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './notification-history-item.component.html',
  styleUrl: './notification-history-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationHistoryItemComponent {
  readonly item = input.required<NotificationHistoryItem>();

  readonly status = computed(() => presentNotificationStatus(this.item().status));
  readonly channel = computed(() => presentNotificationChannel(this.item().channelType));
  readonly attemptedAt = computed(() => formatNotificationDate(this.item().attemptedAt));
  readonly sentAt = computed(() => formatNotificationDate(this.item().sentAt));
  readonly serverName = computed(() => this.item().server.displayName || 'Servidor não informado');
  readonly mapName = computed(() => this.item().map.displayName || 'Mapa não informado');
  readonly gameMode = computed(() => this.item().gameMode || 'Modo não informado');
  readonly players = computed(() => {
    const current = this.item().players.current;
    const maximum = this.item().players.maximum;

    if (current === null && maximum === null) {
      return 'Jogadores indisponíveis';
    }

    return `${current ?? '—'} / ${maximum ?? '—'} jogadores`;
  });
}
