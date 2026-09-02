import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_CONFIG } from '../../../core/config/api-config';
import { BattlefieldMap } from '../models/battlefield-map.model';
import { MapCatalogService } from './map-catalog.service';

describe('MapCatalogService', () => {
  let service: MapCatalogService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MapCatalogService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { baseUrl: 'http://localhost:8080', apiPath: '/api' },
        },
      ],
    });

    service = TestBed.inject(MapCatalogService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should load available maps from the catalog', () => {
    let maps: BattlefieldMap[] | undefined;

    service.list().subscribe((response) => (maps = response));

    const request = httpTesting.expectOne('http://localhost:8080/api/bf4/maps');
    expect(request.request.method).toBe('GET');
    request.flush([
      { id: 'MP_Prison', displayName: 'Operation Locker', expansion: null },
      { id: 'MP_Test', displayName: 'Disabled map', enabled: false, expansion: 'China Rising' },
    ]);

    expect(maps).toEqual([
      { id: 'MP_Prison', displayName: 'Operation Locker', enabled: true, expansion: null },
      { id: 'MP_Test', displayName: 'Disabled map', enabled: false, expansion: 'China Rising' },
    ]);
  });
});
