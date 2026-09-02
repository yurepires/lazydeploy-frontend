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
import { AlertDetailsPageComponent } from './alert-details-page.component';
import { MapCatalogService } from '../../data-access/map-catalog.service';
import { BattlefieldMap } from '../../models/battlefield-map.model';
import { SubscriptionService } from '../../../dashboard/data-access/subscription.service';
import { SubscriptionSummary } from '../../../dashboard/models/subscription-summary.model';

describe('AlertDetailsPageComponent', () => {
  let fixture: ComponentFixture<AlertDetailsPageComponent>;
  let routeParameters: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let subscriptionServiceMock: {
    getById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mapCatalogMock: { list: ReturnType<typeof vi.fn> };
  let dialogMock: { open: ReturnType<typeof vi.fn> };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    routeParameters = new BehaviorSubject(convertToParamMap({ id: 'subscription-1' }));
    subscriptionServiceMock = {
      getById: vi.fn(() => of(createSubscription())),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mapCatalogMock = {
      list: vi.fn(() => of(createMapCatalog())),
    };
    dialogMock = {
      open: vi.fn(() => ({ afterClosed: () => of(false) })),
    };
    snackBarMock = { open: vi.fn() };

    const currentUser = signal<CurrentUser | null>({
      id: 'user-1',
      email: 'player@example.com',
    });

    await TestBed.configureTestingModule({
      imports: [AlertDetailsPageComponent],
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

  function createFixture(): void {
    fixture = TestBed.createComponent(AlertDetailsPageComponent);
    fixture.detectChanges();
  }

  it('should load the subscription from the route id', () => {
    const subscription = createSubscription();
    subscriptionServiceMock.getById.mockReturnValue(of(subscription));

    createFixture();

    expect(subscriptionServiceMock.getById).toHaveBeenCalledWith('subscription-1');
    expect(fixture.nativeElement.textContent).toContain('Servidor de teste');
    expect(fixture.nativeElement.textContent).toContain('Ativo');
    expect(fixture.nativeElement.textContent).toContain('Operation Locker');
    expect(fixture.nativeElement.textContent).toContain('player@example.com');
  });

  it('should reload when the route id changes', () => {
    createFixture();
    routeParameters.next(convertToParamMap({ id: 'subscription-2' }));
    fixture.detectChanges();

    expect(subscriptionServiceMock.getById).toHaveBeenNthCalledWith(2, 'subscription-2');
  });

  it('should render the not found state for a 404 response', () => {
    subscriptionServiceMock.getById.mockReturnValue(
      throwError(() => ({ status: 404, detail: 'Not found' })),
    );

    createFixture();

    expect(fixture.nativeElement.textContent).toContain('Alerta não encontrado');
    expect(fixture.nativeElement.textContent).toContain(
      'Este alerta não existe ou não está disponível para a sua conta.',
    );
  });

  it('should render a retryable state for a generic load error', () => {
    subscriptionServiceMock.getById.mockReturnValue(
      throwError(() => ({ status: 500, code: 'INTERNAL_ERROR' })),
    );

    createFixture();

    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar o alerta');
    expect(fixture.nativeElement.textContent).toContain(
      'Ocorreu um erro inesperado. Tente novamente.',
    );
  });

  it('should update the details after toggling the subscription', () => {
    const disabledSubscription = createSubscription({ enabled: false });
    const enabledSubscription = createSubscription({ enabled: true });
    subscriptionServiceMock.getById.mockReturnValue(of(disabledSubscription));
    subscriptionServiceMock.update.mockReturnValue(of(enabledSubscription));

    createFixture();
    const toggleButton = fixture.nativeElement.querySelector(
      'button[aria-label="Ativar alerta"]',
    ) as HTMLButtonElement;
    toggleButton.click();
    fixture.detectChanges();

    expect(subscriptionServiceMock.update).toHaveBeenCalledWith(disabledSubscription.id, {
      enabled: true,
    });
    expect(fixture.nativeElement.textContent).toContain('Ativo');
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Alerta ativado.',
      'Fechar',
      expect.objectContaining({ duration: 3500 }),
    );
  });

  it('should delete the subscription after confirmation', () => {
    subscriptionServiceMock.delete.mockReturnValue(of(void 0));
    dialogMock.open.mockReturnValue({ afterClosed: () => of(true) });

    createFixture();
    const deleteButton = fixture.nativeElement.querySelector(
      '.alert-details-page__delete',
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    expect(subscriptionServiceMock.delete).toHaveBeenCalledWith('subscription-1');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should not delete when the confirmation is cancelled', () => {
    dialogMock.open.mockReturnValue({ afterClosed: () => of(false) });

    createFixture();
    const deleteButton = fixture.nativeElement.querySelector(
      '.alert-details-page__delete',
    ) as HTMLButtonElement;
    deleteButton.click();

    expect(subscriptionServiceMock.delete).not.toHaveBeenCalled();
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
      {
        id: 'rule-1',
        type: 'MAP_IN',
        enabled: true,
        parameters: { values: ['MP_Prison'] },
      },
      {
        id: 'rule-2',
        type: 'PLAYER_COUNT_AT_LEAST',
        enabled: true,
        parameters: { value: 40 },
      },
    ],
    channels: [
      {
        id: 'channel-1',
        type: 'EMAIL',
        enabled: true,
      },
    ],
    ...overrides,
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
  ];
}
