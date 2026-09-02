import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { BattlefieldMap } from '../../models/battlefield-map.model';
import { RuleSummary } from '../../../dashboard/models/subscription-summary.model';
import {
  mapIdsFromRule,
  presentRule,
  RulePresentation,
} from '../../../dashboard/utils/subscription-rule-presenter';

interface ConditionViewModel {
  readonly id: string;
  readonly enabled: boolean;
  readonly presentation: RulePresentation;
  readonly mapNames: string[];
}

@Component({
  selector: 'app-alert-conditions',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './alert-conditions.component.html',
  styleUrl: './alert-conditions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertConditionsComponent {
  readonly rules = input<RuleSummary[]>([]);
  readonly maps = input<BattlefieldMap[]>([]);

  readonly conditions = computed<ConditionViewModel[]>(() => {
    const mapsById = new Map(this.maps().map((mapItem) => [mapItem.id, mapItem.displayName]));

    return this.rules().map((rule) => {
      const mapNames = mapIdsFromRule(rule).map((mapId) => mapsById.get(mapId) ?? mapId);

      return {
        id: rule.id,
        enabled: rule.enabled,
        presentation: presentRule(rule),
        mapNames,
      };
    });
  });
}
