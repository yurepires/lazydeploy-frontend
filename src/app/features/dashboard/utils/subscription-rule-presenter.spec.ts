import { ChannelSummary, RuleSummary } from '../models/subscription-summary.model';
import { presentChannel, presentRule } from './subscription-rule-presenter';

describe('subscription rule presenter', () => {
  it('should present a map rule using its configured values', () => {
    const rule = createRule('MAP_IN', { values: ['MP_Prison', 'XP0_Metro'] });

    expect(presentRule(rule)).toEqual({
      label: 'Mapas selecionados',
      description: '2 mapas selecionados',
      icon: 'map',
    });
  });

  it('should present a player count rule in friendly language', () => {
    const rule = createRule('PLAYER_COUNT_AT_LEAST', { value: 40 });

    expect(presentRule(rule)).toEqual({
      label: 'Mínimo de jogadores',
      description: 'Mínimo: 40 jogadores',
      icon: 'groups',
    });
  });

  it('should provide a safe fallback for unknown rule types', () => {
    const rule = createRule('UNKNOWN_RULE', {});

    expect(presentRule(rule).label).toBe('Regra personalizada');
  });

  it('should present email channels without exposing configuration details', () => {
    const channel: ChannelSummary = {
      id: 'channel-1',
      type: 'EMAIL',
      enabled: true,
    };

    expect(presentChannel(channel)).toEqual({
      label: 'Email',
      description: 'Notificação por email',
      icon: 'mail',
    });
  });
});

function createRule(type: string, parameters: Record<string, unknown>): RuleSummary {
  return {
    id: 'rule-1',
    type,
    enabled: true,
    parameters,
  };
}
