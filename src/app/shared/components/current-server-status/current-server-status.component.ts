import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { CurrentServerStatus } from '../../models/current-server-status.model';
import { presentGameMode } from '../../utils/game-mode-presenter';
import { presentServerStatusTime } from '../../utils/server-status-time-presenter';

@Component({
  selector: 'app-current-server-status',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './current-server-status.component.html',
  styleUrl: './current-server-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentServerStatusComponent {
  readonly status = input.required<CurrentServerStatus>();
  readonly compact = input(false);

  readonly unavailableMessage = computed(() => {
    switch (this.status().availabilityReason) {
      case 'NOT_OBSERVED_YET':
        return 'Aguardando primeira observação do servidor.';
      case 'STATE_UNAVAILABLE':
        return 'Estado atual do servidor indisponível.';
      default:
        return 'Estado atual indisponível.';
    }
  });

  readonly mapDisplayName = computed(() => {
    const map = this.status().map;
    if (!map) {
      return null;
    }

    if (map.displayName && map.displayName.trim().length > 0) {
      return map.displayName;
    }

    return map.id;
  });
  readonly playersLabel = computed(() => {
    const players = this.status().players;
    if (!players) {
      return null;
    }

    return `${players.current} / ${players.max} jogadores`;
  });
  readonly presentedGameMode = computed(() => presentGameMode(this.status().gameMode));
  readonly lastObservedLabel = computed(() =>
    presentServerStatusTime(this.status().lastObservedAt),
  );
}
