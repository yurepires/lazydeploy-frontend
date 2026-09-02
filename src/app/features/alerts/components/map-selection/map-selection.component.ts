import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

import { BattlefieldMap } from '../../models/battlefield-map.model';

@Component({
  selector: 'app-map-selection',
  standalone: true,
  imports: [MatCheckbox, MatIcon, MatProgressSpinner],
  templateUrl: './map-selection.component.html',
  styleUrl: './map-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapSelectionComponent {
  readonly maps = input<BattlefieldMap[]>([]);
  readonly selectedIds = input<string[]>([]);
  readonly loading = input(false);

  readonly selectionChanged = output<string[]>();

  readonly selectedCount = computed(() => this.selectedIds().length);
  private readonly selectedIdSet = computed(() => new Set(this.selectedIds()));

  isSelected(mapId: string): boolean {
    return this.selectedIdSet().has(mapId);
  }

  toggleMap(map: BattlefieldMap, selected: boolean): void {
    if (this.loading() || !map.enabled) {
      return;
    }

    const nextSelectedIds = new Set(this.selectedIds());

    if (selected) {
      nextSelectedIds.add(map.id);
    } else {
      nextSelectedIds.delete(map.id);
    }

    this.selectionChanged.emit(Array.from(nextSelectedIds));
  }
}
