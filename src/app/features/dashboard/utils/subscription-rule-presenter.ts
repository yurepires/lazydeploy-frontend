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

/**
 * Returns the technical identifiers configured by a MAP_IN rule.
 *
 * Keeping this extraction next to the rule presenter prevents each screen from
 * having to know how rule parameters are represented by the API.
 */
export function mapIdsFromRule(rule: RuleSummary): string[] {
  if (rule.type.toUpperCase() !== 'MAP_IN') {
    return [];
  }

  if (!rule.parameters || typeof rule.parameters !== 'object') {
    return [];
  }

  return readStringArray(rule.parameters['values']);
}

/**
 * Returns the minimum player count configured by a PLAYER_COUNT_AT_LEAST rule.
 */
export function minimumPlayersFromRule(rule: RuleSummary): number | null {
  if (rule.type.toUpperCase() !== 'PLAYER_COUNT_AT_LEAST') {
    return null;
  }

  if (!rule.parameters || typeof rule.parameters !== 'object') {
    return null;
  }

  return readNumber(rule.parameters['value']);
}

function presentMapRule(rule: RuleSummary): RulePresentation {
  const values = mapIdsFromRule(rule);

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
  const minimumPlayers = minimumPlayersFromRule(rule);

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
