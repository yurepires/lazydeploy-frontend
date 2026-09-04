import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_CONFIG } from '../../../core/config/api-config';
import { NotificationHistoryService } from './notification-history.service';

describe('NotificationHistoryService', () => {
  let service: NotificationHistoryService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationHistoryService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { baseUrl: 'http://localhost:8080', apiPath: '/api' },
        },
      ],
    });

    service = TestBed.inject(NotificationHistoryService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should list the authenticated user history with pagination and filters', () => {
    service
      .list({
        page: 2,
        size: 20,
        status: 'FAILED',
        channel: 'EMAIL',
        subscriptionId: 'subscription-1',
      })
      .subscribe();

    const request = httpTesting.expectOne(
      (candidate) => candidate.url === 'http://localhost:8080/api/bf4/notifications',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('status')).toBe('FAILED');
    expect(request.request.params.get('channel')).toBe('EMAIL');
    expect(request.request.params.get('subscriptionId')).toBe('subscription-1');
    expect(request.request.params.has('userId')).toBe(false);
    request.flush(createPage());
  });

  it('should retrieve one notification by id', () => {
    service.getById('notification-1').subscribe();

    const request = httpTesting.expectOne(
      'http://localhost:8080/api/bf4/notifications/notification-1',
    );

    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('should list history scoped to a subscription without adding a user id', () => {
    service
      .listBySubscription('subscription-1', {
        page: 0,
        size: 5,
        status: 'SUCCESS',
      })
      .subscribe();

    const request = httpTesting.expectOne(
      (candidate) =>
        candidate.url ===
        'http://localhost:8080/api/bf4/subscriptions/subscription-1/notifications',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('5');
    expect(request.request.params.get('status')).toBe('SUCCESS');
    expect(request.request.params.has('userId')).toBe(false);
    expect(request.request.params.has('subscriptionId')).toBe(false);
    request.flush(createPage());
  });
});

function createPage() {
  return {
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  };
}
