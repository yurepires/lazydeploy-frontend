import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ApiErrorService } from '../../../../core/http/api-error.service';
import { AlertCardComponent } from '../../components/alert-card/alert-card.component';
import { SubscriptionService } from '../../data-access/subscription.service';
import { SubscriptionSummary } from '../../models/subscription-summary.model';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let subscriptionServiceMock: {
    list: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let dialogMock: { open: ReturnType<typeof vi.fn> };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    subscriptionServiceMock = {
      list: vi.fn(() => of<SubscriptionSummary[]>([])),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    dialogMock = {
      open: vi.fn(() => ({ afterClosed: () => of(false) })),
    };
    snackBarMock = {
      open: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideRouter([]),
        ApiErrorService,
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();
  });

  function createFixture(): void {
    fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
  }

  it('should load subscriptions on initialization', () => {
    const subscriptions = [createSubscription()];
    subscriptionServiceMock.list.mockReturnValue(of(subscriptions));

    createFixture();

    expect(subscriptionServiceMock.list).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.subscriptions()).toEqual(subscriptions);
  });

  it('should render loading skeletons while subscriptions are loading', () => {
    const response = new Subject<SubscriptionSummary[]>();
    subscriptionServiceMock.list.mockReturnValue(response);

    createFixture();

    expect(fixture.nativeElement.querySelectorAll('.alert-skeleton').length).toBe(3);
    expect(fixture.nativeElement.textContent).not.toContain('Nenhum alerta configurado');

    response.next([]);
    response.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.alert-skeleton').length).toBe(0);
  });

  it('should render an empty state when the user has no subscriptions', () => {
    createFixture();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Dashboard');
    expect(compiled.textContent).toContain('Nenhum alerta configurado');
    expect(compiled.querySelector('a[href="/alerts/new"]')).toBeTruthy();
  });

  it('should render a card for each subscription', () => {
    const subscriptions = [
      createSubscription({ id: 'subscription-1' }),
      createSubscription({
        id: 'subscription-2',
        server: { ...createSubscription().server, displayName: 'Outro servidor' },
      }),
    ];
    subscriptionServiceMock.list.mockReturnValue(of(subscriptions));

    createFixture();

    expect(fixture.nativeElement.querySelectorAll('app-alert-card').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Outro servidor');
  });

  it('should render a recoverable error state', () => {
    subscriptionServiceMock.list.mockReturnValue(
      throwError(() => ({ status: 500, code: 'INTERNAL_ERROR' })),
    );

    createFixture();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Não foi possível carregar seus alertas');
    expect(compiled.textContent).toContain('Ocorreu um erro inesperado. Tente novamente.');
    expect(compiled.querySelector('button')?.textContent).toContain('Tentar novamente');
  });

  it('should retry loading after a load error', () => {
    let attempts = 0;
    subscriptionServiceMock.list.mockImplementation(() => {
      attempts += 1;

      if (attempts === 1) {
        return throwError(() => ({ status: 500, code: 'INTERNAL_ERROR' }));
      }

      return of([createSubscription()]);
    });

    createFixture();
    const retryButton = fixture.nativeElement.querySelector(
      '.dashboard-feedback button',
    ) as HTMLButtonElement;
    retryButton.click();
    fixture.detectChanges();

    expect(subscriptionServiceMock.list).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('app-alert-card')).toBeTruthy();
  });

  it('should refresh the aggregated subscription list after the initial load', async () => {
    vi.useFakeTimers();
    try {
      const initialSubscription = createSubscription();
      const refreshedSubscription = createSubscription({
        currentStatus: availableStatus(),
      });
      let requestCount = 0;
      subscriptionServiceMock.list.mockImplementation(() => {
        requestCount += 1;
        return of(requestCount === 1 ? [initialSubscription] : [refreshedSubscription]);
      });

      createFixture();
      expect(requestCount).toBe(1);

      await vi.advanceTimersByTimeAsync(20_000);

      expect(requestCount).toBe(2);
      expect(fixture.componentInstance.subscriptions()).toEqual([refreshedSubscription]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should stop polling when the Dashboard is destroyed', async () => {
    vi.useFakeTimers();
    try {
      subscriptionServiceMock.list.mockReturnValue(of([createSubscription()]));
      createFixture();
      fixture.destroy();

      await vi.advanceTimersByTimeAsync(20_000);

      expect(subscriptionServiceMock.list).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should keep previous data when a background refresh fails', async () => {
    vi.useFakeTimers();
    try {
      const subscription = createSubscription();
      subscriptionServiceMock.list
        .mockReturnValueOnce(of([subscription]))
        .mockReturnValueOnce(throwError(() => ({ status: 500, code: 'INTERNAL_ERROR' })));

      createFixture();
      await vi.advanceTimersByTimeAsync(20_000);

      expect(fixture.componentInstance.subscriptions()).toEqual([subscription]);
      expect(fixture.componentInstance.loadError()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should not overlap background refresh requests', async () => {
    vi.useFakeTimers();
    try {
      const pendingRefresh = new Subject<SubscriptionSummary[]>();
      let requestCount = 0;
      subscriptionServiceMock.list.mockImplementation(() => {
        requestCount += 1;
        if (requestCount === 1) {
          return of([createSubscription()]);
        }

        return pendingRefresh.asObservable();
      });

      createFixture();
      await vi.advanceTimersByTimeAsync(40_000);

      expect(requestCount).toBe(2);

      pendingRefresh.next([createSubscription({ currentStatus: availableStatus() })]);
      pendingRefresh.complete();
      await vi.advanceTimersByTimeAsync(20_000);

      expect(requestCount).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should update a subscription after a successful toggle', () => {
    const subscription = createSubscription({ enabled: true });
    const updatedSubscription = createSubscription({ enabled: false });
    subscriptionServiceMock.list.mockReturnValue(of([subscription]));
    subscriptionServiceMock.update.mockReturnValue(of(updatedSubscription));

    createFixture();
    const toggleButton = fixture.nativeElement.querySelector(
      'button[aria-label="Desativar alerta"]',
    ) as HTMLButtonElement;
    toggleButton.click();
    fixture.detectChanges();

    expect(subscriptionServiceMock.update).toHaveBeenCalledWith(subscription.id, {
      enabled: false,
    });
    expect(fixture.nativeElement.textContent).toContain('Desativado');
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Alerta desativado.',
      'Fechar',
      expect.objectContaining({ duration: 3500 }),
    );
  });

  it('should keep the previous subscription state when toggle fails', () => {
    const subscription = createSubscription({ enabled: true });
    subscriptionServiceMock.list.mockReturnValue(of([subscription]));
    subscriptionServiceMock.update.mockReturnValue(
      throwError(() => ({ status: 409, code: 'CONFLICT' })),
    );

    createFixture();
    const toggleButton = fixture.nativeElement.querySelector(
      'button[aria-label="Desativar alerta"]',
    ) as HTMLButtonElement;
    toggleButton.click();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('button[aria-label="Desativar alerta"]'),
    ).toBeTruthy();
    expect(snackBarMock.open).toHaveBeenCalled();
  });

  it('should not delete when confirmation is cancelled', () => {
    const subscription = createSubscription();
    subscriptionServiceMock.list.mockReturnValue(of([subscription]));
    dialogMock.open.mockReturnValue({ afterClosed: () => of(false) });

    createFixture();
    const deleteButton = fixture.nativeElement.querySelector(
      'button[aria-label="Remover alerta"]',
    ) as HTMLButtonElement;
    deleteButton.click();

    expect(dialogMock.open).toHaveBeenCalled();
    expect(subscriptionServiceMock.delete).not.toHaveBeenCalled();
  });

  it('should remove a subscription after confirmation and successful delete', () => {
    const subscription = createSubscription();
    subscriptionServiceMock.list.mockReturnValue(of([subscription]));
    subscriptionServiceMock.delete.mockReturnValue(of(void 0));
    dialogMock.open.mockReturnValue({ afterClosed: () => of(true) });

    createFixture();
    const deleteButton = fixture.nativeElement.querySelector(
      'button[aria-label="Remover alerta"]',
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    expect(subscriptionServiceMock.delete).toHaveBeenCalledWith(subscription.id);
    expect(fixture.nativeElement.querySelector('app-alert-card')).toBeNull();
    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Alerta removido.',
      'Fechar',
      expect.objectContaining({ duration: 3500 }),
    );
  });

  it('should preserve a card when delete fails', () => {
    const subscription = createSubscription();
    subscriptionServiceMock.list.mockReturnValue(of([subscription]));
    subscriptionServiceMock.delete.mockReturnValue(
      throwError(() => ({ status: 500, code: 'INTERNAL_ERROR' })),
    );
    dialogMock.open.mockReturnValue({ afterClosed: () => of(true) });

    createFixture();
    const deleteButton = fixture.nativeElement.querySelector(
      'button[aria-label="Remover alerta"]',
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-alert-card')).toBeTruthy();
    expect(snackBarMock.open).toHaveBeenCalled();
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
    rules: [],
    channels: [],
    currentStatus: unavailableStatus(),
    ...overrides,
  };
}

function unavailableStatus() {
  return {
    available: false,
    availabilityReason: 'NOT_OBSERVED_YET',
    map: null,
    players: null,
    gameMode: null,
    lastObservedAt: null,
    capturedAt: null,
  } as const;
}

function availableStatus() {
  return {
    available: true,
    availabilityReason: null,
    map: { id: 'MP_Prison', displayName: 'Operation Locker' },
    players: { current: 54, max: 64 },
    gameMode: 'ConquestLarge0',
    lastObservedAt: '2026-09-02T23:44:54Z',
    capturedAt: '2026-09-02T23:44:54Z',
  } as const;
}
