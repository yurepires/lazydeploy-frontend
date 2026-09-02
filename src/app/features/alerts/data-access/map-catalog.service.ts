import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClientService } from '../../../core/http/api-client.service';
import { BattlefieldMap } from '../models/battlefield-map.model';

interface BattlefieldMapApiResponse {
  readonly id: string;
  readonly displayName: string;
  readonly enabled?: boolean;
  readonly expansion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MapCatalogService {
  private readonly apiClient = inject(ApiClientService);

  list(): Observable<BattlefieldMap[]> {
    return this.apiClient
      .get<BattlefieldMapApiResponse[]>('/bf4/maps')
      .pipe(map((maps) => maps.map((mapItem) => this.toBattlefieldMap(mapItem))));
  }

  private toBattlefieldMap(mapItem: BattlefieldMapApiResponse): BattlefieldMap {
    return {
      id: mapItem.id,
      displayName: mapItem.displayName,
      enabled: mapItem.enabled ?? true,
      expansion: mapItem.expansion,
    };
  }
}
