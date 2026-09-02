import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_CONFIG } from '../../../core/config/api-config';
import { ServerSearchResult } from '../models/server-search-result.model';
import { ServerDiscoveryService } from './server-discovery.service';

describe('ServerDiscoveryService', () => {
  let service: ServerDiscoveryService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ServerDiscoveryService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { baseUrl: 'http://localhost:8080', apiPath: '/api' },
        },
      ],
    });

    service = TestBed.inject(ServerDiscoveryService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should search servers and map provider metadata', () => {
    let results: ServerSearchResult[] | undefined;

    service.search('LOST CONQUEST').subscribe((response) => (results = response));

    const request = httpTesting.expectOne(
      (candidate) =>
        candidate.url === 'http://localhost:8080/api/bf4/servers/search' &&
        candidate.params.get('query') === 'LOST CONQUEST' &&
        candidate.params.get('limit') === '20',
    );
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        externalGuid: 'guid-1',
        displayName: 'LOST CONQUEST',
        provider: 'GAMETOOLS',
        metadata: {
          currentMap: 'XP3_MarketPl',
          players: 58,
          maxPlayers: 64,
          waitingPlayers: 2,
          gameMode: 'Conquest Large',
        },
      },
    ]);

    expect(results).toEqual([
      {
        guid: 'guid-1',
        displayName: 'LOST CONQUEST',
        mapId: 'XP3_MarketPl',
        mapDisplayName: undefined,
        players: 58,
        maxPlayers: 64,
        queue: 2,
        gameMode: 'Conquest Large',
      },
    ]);
  });

  it('should encode the search query through HttpParams', () => {
    service.search('server with spaces', 7).subscribe();

    const request = httpTesting.expectOne(
      (candidate) =>
        candidate.url === 'http://localhost:8080/api/bf4/servers/search' &&
        candidate.params.get('query') === 'server with spaces' &&
        candidate.params.get('limit') === '7',
    );

    request.flush([]);
  });
});
