import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorService } from '../../../../core/http/api-error.service';
import { CurrentUser } from '../../../../shared/models/current-user.model';
import { SubscriptionService } from '../../../dashboard/data-access/subscription.service';
import { MapSelectionComponent } from '../../components/map-selection/map-selection.component';
import { ServerSearchResultCardComponent } from '../../components/server-search-result-card/server-search-result-card.component';
import { MapCatalogService } from '../../data-access/map-catalog.service';
import { ServerDiscoveryService } from '../../data-access/server-discovery.service';
import { BattlefieldMap } from '../../models/battlefield-map.model';
import {
  ConfiguredSubscriptionResponse,
  ConfigureSubscriptionRequest,
} from '../../models/configure-subscription-request.model';
import { ServerSearchResult } from '../../models/server-search-result.model';
import { CreateAlertPageComponent } from './create-alert-page.component';

describe('CreateAlertPageComponent', () => {
  let fixture: ComponentFixture<CreateAlertPageComponent>;
  let serverDiscoveryMock: { search: ReturnType<typeof vi.fn> };
  let mapCatalogMock: { list: ReturnType<typeof vi.fn> };
  let subscriptionServiceMock: { configure: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    serverDiscoveryMock = { search: vi.fn(() => of([serverResult()])) };
    mapCatalogMock = { list: vi.fn(() => of(mapCatalog())) };
    subscriptionServiceMock = { configure: vi.fn() };

    const currentUser = signal<CurrentUser | null>({
      id: 'user-1',
      email: 'player@example.com',
    });
    const authServiceMock = {
      currentUser,
      loadCurrentUser: vi.fn(() => of(currentUser())),
    };

    await TestBed.configureTestingModule({
      imports: [CreateAlertPageComponent],
      providers: [
        provideRouter([]),
        ApiErrorService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: ServerDiscoveryService, useValue: serverDiscoveryMock },
        { provide: MapCatalogService, useValue: mapCatalogMock },
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function createFixture(): void {
    fixture = TestBed.createComponent(CreateAlertPageComponent);
    fixture.detectChanges();
  }

  function completeConfiguration(): void {
    const component = fixture.componentInstance;

    component.selectServer(serverResult());
    component.nextStep();
    component.onMapSelectionChanged(['MP_Prison', 'XP3_MarketPl']);
    component.nextStep();
    component.nextStep();
    fixture.detectChanges();
  }

  it('should start on the server step without selecting a result automatically', () => {
    createFixture();

    expect(fixture.componentInstance.currentStep()).toBe(1);
    expect(fixture.componentInstance.selectedServer()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Qual servidor você quer monitorar?');
  });

  it('should not search below the minimum query length', async () => {
    vi.useFakeTimers();

    try {
      createFixture();
      inputQuery('a');
      await vi.advanceTimersByTimeAsync(400);

      expect(serverDiscoveryMock.search).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should debounce server searches and keep the newest response', async () => {
    vi.useFakeTimers();
    const firstResponse = new Subject<ServerSearchResult[]>();
    const secondResponse = new Subject<ServerSearchResult[]>();
    serverDiscoveryMock.search.mockImplementation((query: string) => {
      if (query === 'AB') {
        return firstResponse;
      }

      return secondResponse;
    });

    try {
      createFixture();
      inputQuery('AB');
      await vi.advanceTimersByTimeAsync(351);
      inputQuery('ABCD');
      await vi.advanceTimersByTimeAsync(351);

      firstResponse.next([{ ...serverResult(), guid: 'old-guid' }]);
      secondResponse.next([{ ...serverResult(), guid: 'new-guid' }]);
      fixture.detectChanges();

      expect(fixture.componentInstance.serverResults()).toEqual([
        { ...serverResult(), guid: 'new-guid' },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should require an explicit server selection before proceeding', () => {
    createFixture();

    fixture.componentInstance.nextStep();

    expect(fixture.componentInstance.currentStep()).toBe(1);
    expect(fixture.componentInstance.serverGroup.controls.selectedServer.touched).toBe(true);
  });

  it('should load maps once after explicit server selection and preserve form values', () => {
    createFixture();
    const component = fixture.componentInstance;

    component.selectServer(serverResult());
    component.nextStep();
    component.onMapSelectionChanged(['MP_Prison']);
    component.nextStep();
    component.previousStep();

    expect(component.currentStep()).toBe(2);
    expect(component.selectedMapIds()).toEqual(['MP_Prison']);
    expect(component.minimumPlayersControl.value).toBe(40);
    expect(mapCatalogMock.list).toHaveBeenCalledTimes(1);
  });

  it('should build the atomic payload with technical map ids and no recipient or user id', () => {
    createFixture();
    const component = fixture.componentInstance;
    const response = configuredResponse();
    subscriptionServiceMock.configure.mockReturnValue(of(response));

    completeConfiguration();
    component.submit();

    const request = subscriptionServiceMock.configure.mock
      .calls[0][0] as ConfigureSubscriptionRequest;
    expect(request).toEqual({
      serverGuid: 'guid-1',
      displayName: 'LOST CONQUEST',
      enabled: true,
      rules: [
        { type: 'MAP_IN', enabled: true, parameters: { values: ['MP_Prison', 'XP3_MarketPl'] } },
        { type: 'PLAYER_COUNT_AT_LEAST', enabled: true, parameters: { value: 40 } },
      ],
      channels: [{ type: 'EMAIL', enabled: true }],
    });
    expect(request).not.toHaveProperty('recipient');
    expect(request).not.toHaveProperty('userId');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should prevent submission without at least one selected map', () => {
    createFixture();
    const component = fixture.componentInstance;

    component.selectServer(serverResult());
    component.nextStep();
    component.nextStep();

    expect(component.currentStep()).toBe(2);
    expect(subscriptionServiceMock.configure).not.toHaveBeenCalled();
  });

  it('should prevent submission when email is disabled', () => {
    createFixture();
    const component = fixture.componentInstance;

    completeConfiguration();
    component.notificationsGroup.controls.emailEnabled.setValue(false);
    component.previousStep();
    component.nextStep();

    expect(component.currentStep()).toBe(3);
    component.nextStep();
    expect(component.currentStep()).toBe(3);
  });

  it('should preserve the wizard and show a friendly error when creation fails', () => {
    createFixture();
    const component = fixture.componentInstance;
    subscriptionServiceMock.configure.mockReturnValue(
      throwError(() => ({ errorCode: 'SUBSCRIPTION_ALREADY_EXISTS' })),
    );

    completeConfiguration();
    component.submit();

    expect(component.currentStep()).toBe(4);
    expect(component.submitError()).toBe('Você já possui um alerta para este servidor.');
    expect(component.selectedServer()?.guid).toBe('guid-1');
    expect(component.selectedMapIds()).toEqual(['MP_Prison', 'XP3_MarketPl']);
  });

  it('should not submit twice while the first request is pending', () => {
    createFixture();
    const pendingResponse = new Subject<ConfiguredSubscriptionResponse>();
    subscriptionServiceMock.configure.mockReturnValue(pendingResponse);
    const component = fixture.componentInstance;

    completeConfiguration();
    component.submit();
    component.submit();

    expect(subscriptionServiceMock.configure).toHaveBeenCalledTimes(1);

    pendingResponse.next(configuredResponse());
    pendingResponse.complete();
  });

  function inputQuery(query: string): void {
    fixture.componentInstance.onServerQueryInput({
      target: { value: query },
    } as unknown as Event);
  }
});

function serverResult(): ServerSearchResult {
  return {
    guid: 'guid-1',
    displayName: 'LOST CONQUEST',
    mapId: 'MP_Prison',
    mapDisplayName: 'Operation Locker',
    players: 58,
    maxPlayers: 64,
    queue: 1,
    gameMode: 'Conquest Large',
  };
}

function mapCatalog(): BattlefieldMap[] {
  return [
    { id: 'MP_Prison', displayName: 'Operation Locker', enabled: true, expansion: null },
    { id: 'XP3_MarketPl', displayName: 'Pearl Market', enabled: true, expansion: 'Final Stand' },
  ];
}

function configuredResponse(): ConfiguredSubscriptionResponse {
  return {
    id: 'subscription-1',
    enabled: true,
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: null,
    server: {
      id: 'server-1',
      guid: 'guid-1',
      displayName: 'LOST CONQUEST',
    },
    rules: [],
    channels: [],
  };
}
