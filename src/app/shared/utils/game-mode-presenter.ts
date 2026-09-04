export function presentGameMode(gameMode: string | null | undefined): string | null {
  if (!gameMode || gameMode.trim().length === 0) {
    return null;
  }

  const normalizedGameMode = gameMode.trim().toUpperCase();

  switch (normalizedGameMode) {
    case 'CONQUESTLARGE0':
    case 'CONQUESTLARGE':
    case 'CONQUEST_LARGE':
      return 'Conquest Large';
    case 'CONQUESTSMALL0':
    case 'CONQUESTSMALL':
    case 'CONQUEST_SMALL':
      return 'Conquest Small';
    case 'TEAMDEATHMATCH0':
    case 'TEAMDEATHMATCH':
    case 'TDM':
      return 'Team Deathmatch';
    case 'RUSH0':
    case 'RUSH':
      return 'Rush';
    case 'DOMINATION0':
    case 'DOMINATION':
      return 'Domination';
    default:
      return gameMode.trim();
  }
}
