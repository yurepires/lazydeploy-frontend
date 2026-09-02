import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClientService } from '../../../core/http/api-client.service';
import { ServerSearchResult } from '../models/server-search-result.model';

interface ServerSearchApiResponse {
  readonly externalGuid: string;
  readonly displayName: string;
  readonly metadata?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ServerDiscoveryService {
  private readonly apiClient = inject(ApiClientService);

  search(query: string, limit = 20): Observable<ServerSearchResult[]> {
    const params = new HttpParams().set('query', query.trim()).set('limit', limit.toString());

    return this.apiClient
      .get<ServerSearchApiResponse[]>('/bf4/servers/search', { params })
      .pipe(map((responses) => responses.map((response) => this.toSearchResult(response))));
  }

  private toSearchResult(response: ServerSearchApiResponse): ServerSearchResult {
    const metadata = response.metadata ?? {};

    return {
      guid: response.externalGuid,
      displayName: response.displayName,
      mapId: this.readString(metadata['currentMap']),
      mapDisplayName: this.readString(metadata['mapDisplayName']),
      players: this.readNumber(metadata['players']),
      maxPlayers: this.readNumber(metadata['maxPlayers']),
      queue: this.readNumber(metadata['waitingPlayers']),
      gameMode: this.readString(metadata['gameMode']),
    };
  }

  private readString(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return undefined;
    }

    return value;
  }

  private readNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }

    return undefined;
  }
}
