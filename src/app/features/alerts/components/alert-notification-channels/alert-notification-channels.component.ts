import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { ChannelSummary } from '../../../dashboard/models/subscription-summary.model';
import {
  ChannelPresentation,
  presentChannel,
} from '../../../dashboard/utils/subscription-rule-presenter';

interface NotificationChannelViewModel {
  readonly id: string;
  readonly type: string;
  readonly enabled: boolean;
  readonly presentation: ChannelPresentation;
}

@Component({
  selector: 'app-alert-notification-channels',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './alert-notification-channels.component.html',
  styleUrl: './alert-notification-channels.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertNotificationChannelsComponent {
  readonly channels = input<ChannelSummary[]>([]);
  readonly accountEmail = input<string | null>(null);

  readonly presentedChannels = computed<NotificationChannelViewModel[]>(() =>
    this.channels().map((channel) => ({
      id: channel.id,
      type: channel.type,
      enabled: channel.enabled,
      presentation: presentChannel(channel),
    })),
  );
}
