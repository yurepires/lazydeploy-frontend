import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import {
  ChannelSummary,
  RuleSummary,
  SubscriptionSummary,
} from '../../models/subscription-summary.model';
import { AlertCardComponent } from './alert-card.component';

describe('AlertCardComponent', () => {
  let fixture: ComponentFixture<AlertCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function createCard(subscription: SubscriptionSummary = createSubscription()): void {
    fixture = TestBed.createComponent(AlertCardComponent);
    fixture.componentRef.setInput('subscription', subscription);
    fixture.detectChanges();
  }

  it('should render the server display name', () => {
    createCard();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Servidor de teste');
  });

  it('should render the active status', () => {
    createCard(createSubscription({ enabled: true }));

    expect(fixture.nativeElement.textContent).toContain('Ativo');
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Desativar alerta"]'),
    ).toBeTruthy();
  });

  it('should render the disabled status', () => {
    createCard(createSubscription({ enabled: false }));

    expect(fixture.nativeElement.textContent).toContain('Desativado');
    expect(fixture.nativeElement.querySelector('button[aria-label="Ativar alerta"]')).toBeTruthy();
  });

  it('should present rules and channels in friendly language', () => {
    createCard(
      createSubscription({
        rules: [
          createRule('MAP_IN', { values: ['MP_Prison', 'XP0_Metro'] }),
          createRule('PLAYER_COUNT_AT_LEAST', { value: 40 }),
        ],
        channels: [createChannel('EMAIL')],
      }),
    );

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('2 mapas selecionados');
    expect(text).toContain('Mínimo: 40 jogadores');
    expect(text).toContain('Email');
  });

  it('should emit toggle and delete events', () => {
    createCard();
    let toggleEmitted = false;
    let deleteEmitted = false;

    fixture.componentInstance.toggleEnabled.subscribe(() => (toggleEmitted = true));
    fixture.componentInstance.deleteRequested.subscribe(() => (deleteEmitted = true));

    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Desativar alerta"]',
      ) as HTMLButtonElement
    ).click();
    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Remover alerta"]',
      ) as HTMLButtonElement
    ).click();

    expect(toggleEmitted).toBe(true);
    expect(deleteEmitted).toBe(true);
  });

  it('should disable actions while updating or deleting', () => {
    createCard();

    fixture.componentRef.setInput('updating', true);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons.forEach((button: HTMLButtonElement) => expect(button.disabled).toBe(true));

    fixture.componentRef.setInput('updating', false);
    fixture.componentRef.setInput('deleting', true);
    fixture.detectChanges();

    buttons.forEach((button: HTMLButtonElement) => expect(button.disabled).toBe(true));
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

function createRule(type: string, parameters: Record<string, unknown>): RuleSummary {
  return {
    id: `${type}-1`,
    type,
    enabled: true,
    parameters,
  };
}

function createChannel(type: string): ChannelSummary {
  return {
    id: `${type}-1`,
    type,
    enabled: true,
  };
}
