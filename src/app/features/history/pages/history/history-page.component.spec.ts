import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ApiErrorService } from '../../../../core/http/api-error.service';
import { NotificationHistoryService } from '../../data-access/notification-history.service';
import { NotificationHistoryItem } from '../../models/notification-history-item.model';
import { HistoryPageComponent } from './history-page.component';

describe('HistoryPageComponent', () => {
  let fixture: ComponentFixture<HistoryPageComponent>;
  let queryParameters: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let historyServiceMock: {
    list: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    queryParameters = new BehaviorSubject(
      convertToParamMap({ status: 'SUCCESS', channel: 'EMAIL', page: '1' }),
    );
    historyServiceMock = {
      list: vi.fn(() => of(createPage([createHistoryItem()]))),
    };

    await TestBed.configureTestingModule({
      imports: [HistoryPageComponent],
      providers: [
        provideRouter([]),
        ApiErrorService,
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: queryParameters.asObservable() },
        },
        { provide: NotificationHistoryService, useValue: historyServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function createFixture(): HistoryPageComponent {
    fixture = TestBed.createComponent(HistoryPageComponent);
    fixture.detectChanges();

    return fixture.componentInstance;
  }

  it('should restore filters and page from the URL', () => {
    const component = createFixture();

    expect(component.page()).toBe(1);
    expect(component.statusFilter()).toBe('SUCCESS');
    expect(component.channelFilter()).toBe('EMAIL');
    expect(historyServiceMock.list).toHaveBeenCalledWith({
      page: 1,
      size: 20,
      status: 'SUCCESS',
      channel: 'EMAIL',
      subscriptionId: null,
    });
  });

  it('should render historical server, map, players and status', () => {
    createFixture();

    expect(fixture.nativeElement.textContent).toContain('Operation Locker');
    expect(fixture.nativeElement.textContent).toContain('LOST Conquest Classics');
    expect(fixture.nativeElement.textContent).toContain('54 / 64 jogadores');
    expect(fixture.nativeElement.textContent).toContain('Enviado');
    expect(fixture.nativeElement.textContent).toContain('Email');
  });

  it('should reset the page and synchronize a changed status filter', () => {
    const component = createFixture();

    component.onStatusChanged('FAILED');

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: {
          page: null,
          status: 'FAILED',
          channel: 'EMAIL',
          subscriptionId: null,
        },
        replaceUrl: true,
      }),
    );
  });

  it('should render a recoverable error state', () => {
    historyServiceMock.list.mockReturnValue(
      throwError(() => ({ status: 500, code: 'INTERNAL_ERROR' })),
    );

    createFixture();

    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar o histórico');
    expect(fixture.nativeElement.textContent).toContain(
      'Ocorreu um erro inesperado. Tente novamente.',
    );
  });

  it('should show a filtered empty state', () => {
    historyServiceMock.list.mockReturnValue(of(createPage([])));

    createFixture();

    expect(fixture.nativeElement.textContent).toContain('Nenhum resultado encontrado');
    expect(fixture.nativeElement.textContent).toContain('Limpar filtros');
  });
});

function createPage(content: NotificationHistoryItem[]) {
  return {
    content,
    page: 1,
    size: 20,
    totalElements: content.length,
    totalPages: 2,
    first: false,
    last: false,
  };
}

function createHistoryItem(): NotificationHistoryItem {
  return {
    id: 'notification-1',
    subscriptionId: 'subscription-1',
    server: {
      id: 'server-1',
      displayName: 'LOST Conquest Classics',
    },
    roundInstanceId: 'round-1',
    map: {
      id: 'MP_Prison',
      displayName: 'Operation Locker',
    },
    players: {
      current: 54,
      maximum: 64,
    },
    gameMode: 'Conquest Large',
    channelType: 'EMAIL',
    status: 'SUCCESS',
    attemptedAt: '2026-09-02T12:00:00Z',
    sentAt: '2026-09-02T12:00:02Z',
  };
}
