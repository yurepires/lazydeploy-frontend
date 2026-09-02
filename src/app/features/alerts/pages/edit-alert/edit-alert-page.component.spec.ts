import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorService } from '../../../../core/http/api-error.service';
import { CurrentUser } from '../../../../shared/models/current-user.model';
import { MapCatalogService } from '../../data-access/map-catalog.service';
import { BattlefieldMap } from '../../models/battlefield-map.model';
import { EditAlertPageComponent } from './edit-alert-page.component';
import { SubscriptionService } from '../../../dashboard/data-access/subscription.service';
import {
  RuleSummary,
  SubscriptionSummary,
} from '../../../dashboard/models/subscription-summary.model';

describe('EditAlertPageComponent', () => {
  let fixture: ComponentFixture<EditAlertPageComponent>;
  let routeParameters: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let subscriptionServiceMock: {
    getById: ReturnType<typeof vi.fn>;
    updateRule: ReturnType<typeof vi.fn>;
  };
  let mapCatalogMock: { list: ReturnType<typeof vi.fn> };
  let dialogMock: { open: ReturnType<typeof vi.fn> };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    routeParameters = new BehaviorSubject(convertToParamMap({ id: 'subscription-1' }));
    subscriptionServiceMock = {
      getById: vi.fn(() => of(createSubscription())),
      updateRule: vi.fn(() => of(createRule('updated-rule', 'MAP_IN', { values: ['MP_Prison'] }))),
    };
    mapCatalogMock = { list: vi.fn(() => of(createMapCatalog())) };
    dialogMock = { open: vi.fn(() => ({ afterClosed: () => of(false) })) };
    snackBarMock = { open: vi.fn() };

    const currentUser = signal<CurrentUser | null>({
      id: 'user-1',
      email: 'player@example.com',
    });

    await TestBed.configureTestingModule({
      imports: [EditAlertPageComponent],
      providers: [
        provideRouter([]),
        ApiErrorService,
        { provide: ActivatedRoute, useValue: { paramMap: routeParameters.asObservable() } },
        { provide: AuthService, useValue: { currentUser } },
        { provide: MapCatalogService, useValue: mapCatalogMock },
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: Title, useValue: { setTitle: vi.fn() } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function createFixture(): EditAlertPageComponent {
    fixture = TestBed.createComponent(EditAlertPageComponent);
    fixture.detectChanges();

    return fixture.componentInstance;
  }

  it('should load the subscription and map catalog into the form', () => {
    const component = createFixture();

    expect(subscriptionServiceMock.getById).toHaveBeenCalledWith('subscription-1');
    expect(mapCatalogMock.list).toHaveBeenCalledTimes(1);
    expect(component.selectedMapIds()).toEqual(['MP_Prison']);
    expect(component.minimumPlayers()).toBe(40);
    expect(component.editAlertForm.pristine).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Servidor de teste');
    expect(fixture.nativeElement.textContent).toContain('player@example.com');
  });

  it('should locate required rules by type regardless of their order', () => {
    subscriptionServiceMock.getById.mockReturnValue(
      of(
        createSubscription({
          rules: [
            createRule('player-rule', 'PLAYER_COUNT_AT_LEAST', { value: 55 }),
            createRule('map-rule', 'MAP_IN', { values: ['MP_Prison'] }),
          ],
        }),
      ),
    );

    const component = createFixture();

    expect(component.minimumPlayers()).toBe(55);
    expect(component.selectedMapIds()).toEqual(['MP_Prison']);
    expect(component.invalidConfiguration()).toBe(false);
  });

  it('should detect map changes without considering ordering changes', () => {
    const component = createFixture();

    component.onMapSelectionChanged(['MP_Prison']);
    expect(component.hasChanges()).toBe(false);

    component.onMapSelectionChanged(['XP0_Metro', 'MP_Prison']);
    expect(component.mapsChanged()).toBe(true);
    expect(component.hasChanges()).toBe(true);
  });

  it('should patch only the map rule when maps change', () => {
    const component = createFixture();
    component.onMapSelectionChanged(['XP0_Metro']);
    subscriptionServiceMock.updateRule.mockReturnValue(of(createRule('rule-1', 'MAP_IN', {})));

    component.saveChanges();

    expect(subscriptionServiceMock.updateRule).toHaveBeenCalledTimes(1);
    expect(subscriptionServiceMock.updateRule).toHaveBeenCalledWith('subscription-1', 'rule-1', {
      type: 'MAP_IN',
      enabled: true,
      parameters: { values: ['XP0_Metro'] },
    });
    expect(router.navigate).toHaveBeenCalledWith(['/alerts', 'subscription-1']);
  });

  it('should patch only the player rule when the minimum changes', () => {
    const component = createFixture();
    component.minimumPlayersControl.setValue(55);

    component.saveChanges();

    expect(subscriptionServiceMock.updateRule).toHaveBeenCalledTimes(1);
    expect(subscriptionServiceMock.updateRule).toHaveBeenCalledWith('subscription-1', 'rule-2', {
      type: 'PLAYER_COUNT_AT_LEAST',
      enabled: true,
      parameters: { value: 55 },
    });
  });

  it('should not call the backend when nothing changed', () => {
    const component = createFixture();

    component.saveChanges();

    expect(subscriptionServiceMock.updateRule).not.toHaveBeenCalled();
  });

  it('should reload the persisted state after a partial save failure', () => {
    const component = createFixture();
    component.onMapSelectionChanged(['XP0_Metro']);
    component.minimumPlayersControl.setValue(55);
    subscriptionServiceMock.updateRule
      .mockReturnValueOnce(of(createRule('rule-1', 'MAP_IN', { values: ['XP0_Metro'] })))
      .mockReturnValueOnce(throwError(() => ({ status: 409, code: 'CONFLICT' })));
    const persistedSubscription = createSubscription({
      rules: [
        createRule('rule-1', 'MAP_IN', { values: ['XP0_Metro'] }),
        createRule('rule-2', 'PLAYER_COUNT_AT_LEAST', { value: 40 }),
      ],
    });
    subscriptionServiceMock.getById.mockReturnValueOnce(of(persistedSubscription));

    component.saveChanges();

    expect(subscriptionServiceMock.getById).toHaveBeenCalledTimes(2);
    expect(component.selectedMapIds()).toEqual(['XP0_Metro']);
    expect(component.minimumPlayers()).toBe(40);
    expect(component.saveError()).toContain('Algumas alterações não puderam ser salvas');
    expect(component.hasChanges()).toBe(false);
  });

  it('should ask for confirmation before leaving with unsaved changes', () => {
    const component = createFixture();
    component.onMapSelectionChanged(['XP0_Metro']);
    dialogMock.open.mockReturnValue({ afterClosed: () => of(false) });

    const result = component.canDeactivate();
    let canLeave: boolean | undefined;
    (result as ReturnType<typeof of>).subscribe((allowed) => (canLeave = allowed));

    expect(dialogMock.open).toHaveBeenCalledTimes(1);
    expect(canLeave).toBe(false);
  });

  it('should report an inconsistent configuration instead of creating missing rules', () => {
    subscriptionServiceMock.getById.mockReturnValue(
      of(
        createSubscription({ rules: [createRule('rule-1', 'MAP_IN', { values: ['MP_Prison'] })] }),
      ),
    );

    const component = createFixture();

    expect(component.invalidConfiguration()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Não foi possível editar este alerta');
    expect(subscriptionServiceMock.updateRule).not.toHaveBeenCalled();
  });
});

function createSubscription(overrides: Partial<SubscriptionSummary> = {}): SubscriptionSummary {
  return {
    id: 'subscription-1',
    enabled: true,
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: null,
    server: {
      id: 'server-1',
      guid: 'server-guid-1',
      displayName: 'Servidor de teste',
    },
    rules: [
      createRule('rule-1', 'MAP_IN', { values: ['MP_Prison'] }),
      createRule('rule-2', 'PLAYER_COUNT_AT_LEAST', { value: 40 }),
    ],
    channels: [{ id: 'channel-1', type: 'EMAIL', enabled: true }],
    ...overrides,
  };
}

function createRule(id: string, type: string, parameters: Record<string, unknown>): RuleSummary {
  return {
    id,
    type,
    enabled: true,
    parameters,
  };
}

function createMapCatalog(): BattlefieldMap[] {
  return [
    {
      id: 'MP_Prison',
      displayName: 'Operation Locker',
      enabled: true,
      expansion: null,
    },
    {
      id: 'XP0_Metro',
      displayName: 'Operation Metro',
      enabled: true,
      expansion: null,
    },
  ];
}
