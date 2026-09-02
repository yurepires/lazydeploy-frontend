import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_CONFIG } from '../../../core/config/api-config';
import {
  ConfigureSubscriptionRequest,
  ConfiguredSubscriptionResponse,
} from '../../alerts/models/configure-subscription-request.model';
import { SubscriptionService } from './subscription.service';
import { SubscriptionSummary } from '../models/subscription-summary.model';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SubscriptionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { baseUrl: 'http://localhost:8080', apiPath: '/api' },
        },
      ],
    });

    service = TestBed.inject(SubscriptionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should list subscriptions for the authenticated user', () => {
    const subscriptions = [createSubscription()];
    let response: SubscriptionSummary[] | undefined;

    service.list().subscribe((result) => (response = result));

    const request = httpTesting.expectOne('http://localhost:8080/api/bf4/subscriptions');
    expect(request.request.method).toBe('GET');
    request.flush(subscriptions);

    expect(response).toEqual(subscriptions);
  });

  it('should patch the enabled state', () => {
    const subscription = createSubscription({ enabled: false });
    let response: SubscriptionSummary | undefined;

    service.update(subscription.id, { enabled: false }).subscribe((result) => (response = result));

    const request = httpTesting.expectOne(
      `http://localhost:8080/api/bf4/subscriptions/${subscription.id}`,
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ enabled: false });
    request.flush(subscription);

    expect(response).toEqual(subscription);
  });

  it('should delete a subscription', () => {
    const subscription = createSubscription();
    let completed = false;

    service.delete(subscription.id).subscribe({ complete: () => (completed = true) });

    const request = httpTesting.expectOne(
      `http://localhost:8080/api/bf4/subscriptions/${subscription.id}`,
    );
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    expect(completed).toBe(true);
  });

  it('should patch an existing rule with its updated parameters', () => {
    const rule = {
      id: 'rule-1',
      type: 'MAP_IN',
      enabled: true,
      parameters: { values: ['XP0_Metro'] },
    };

    service
      .updateRule('subscription-1', 'rule-1', {
        type: 'MAP_IN',
        enabled: true,
        parameters: { values: ['XP0_Metro'] },
      })
      .subscribe();

    const request = httpTesting.expectOne(
      'http://localhost:8080/api/bf4/subscriptions/subscription-1/rules/rule-1',
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      type: 'MAP_IN',
      enabled: true,
      parameters: { values: ['XP0_Metro'] },
    });
    request.flush(rule);
  });

  it('should configure a subscription atomically', () => {
    const request: ConfigureSubscriptionRequest = {
      serverGuid: 'server-guid-1',
      displayName: 'Servidor de teste',
      enabled: true,
      rules: [
        { type: 'MAP_IN', enabled: true, parameters: { values: ['MP_Prison'] } },
        { type: 'PLAYER_COUNT_AT_LEAST', enabled: true, parameters: { value: 40 } },
      ],
      channels: [{ type: 'EMAIL', enabled: true }],
    };
    const response: ConfiguredSubscriptionResponse = {
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
    };
    let receivedResponse: ConfiguredSubscriptionResponse | undefined;

    service.configure(request).subscribe((result) => (receivedResponse = result));

    const httpRequest = httpTesting.expectOne(
      'http://localhost:8080/api/bf4/subscriptions/configure',
    );
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush(response);

    expect(receivedResponse).toEqual(response);
  });

  it('should use the configured API base URL', () => {
    service.getById('subscription-42').subscribe();

    const request = httpTesting.expectOne(
      'http://localhost:8080/api/bf4/subscriptions/subscription-42',
    );
    expect(request.request.url).toBe('http://localhost:8080/api/bf4/subscriptions/subscription-42');
    request.flush(createSubscription({ id: 'subscription-42' }));
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
    ...overrides,
  };
}
