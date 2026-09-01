import { ChannelSummary, RuleSummary } from '../models/subscription-summary.model';

export interface RulePresentation {
  readonly label: string;
  readonly description: string;
  readonly icon: string;
}

export interface ChannelPresentation {
  readonly label: string;
  readonly description: string;
  readonly icon: string;
}

export function presentRule(rule: RuleSummary): RulePresentation {
  switch (rule.type.toUpperCase()) {
    case 'MAP_IN':
      return presentMapRule(rule);
    case 'PLAYER_COUNT_AT_LEAST':
      return presentPlayerCountRule(rule);
    default:
      return {
        label: 'Regra personalizada',
        description: 'Uma regra adicional está configurada.',
        icon: 'tune',
      };
  }
}

export function presentChannel(channel: ChannelSummary): ChannelPresentation {
  switch (channel.type.toUpperCase()) {
    case 'EMAIL':
      return {
        label: 'Email',
        description: 'Notificação por email',
        icon: 'mail',
      };
    default:
      return {
        label: 'Canal adicional',
        description: 'Canal de notificação configurado',
        icon: 'notifications',
      };
  }
}

function presentMapRule(rule: RuleSummary): RulePresentation {
  const values = readStringArray(rule.parameters['values']);

  if (values.length === 0) {
    return {
      label: 'Mapas selecionados',
      description: 'Mapas configurados',
      icon: 'map',
    };
  }

  const mapCount = values.length;
  let mapLabel = 'mapas selecionados';

  if (mapCount === 1) {
    mapLabel = 'mapa selecionado';
  }

  return {
    label: 'Mapas selecionados',
    description: `${mapCount} ${mapLabel}`,
    icon: 'map',
  };
}

function presentPlayerCountRule(rule: RuleSummary): RulePresentation {
  const minimumPlayers = readNumber(rule.parameters['value']);

  if (minimumPlayers === null) {
    return {
      label: 'Mínimo de jogadores',
      description: 'Quantidade mínima configurada',
      icon: 'groups',
    };
  }

  return {
    label: 'Mínimo de jogadores',
    description: `Mínimo: ${minimumPlayers} jogadores`,
    icon: 'groups',
  };
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}
