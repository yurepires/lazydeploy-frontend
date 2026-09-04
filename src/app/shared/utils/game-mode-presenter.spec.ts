import { presentGameMode } from './game-mode-presenter';

describe('presentGameMode', () => {
  it('should translate known technical game mode identifiers', () => {
    expect(presentGameMode('ConquestLarge0')).toBe('Conquest Large');
    expect(presentGameMode('TDM')).toBe('Team Deathmatch');
  });

  it('should preserve an already friendly game mode', () => {
    expect(presentGameMode('Conquest Large')).toBe('Conquest Large');
  });

  it('should return null when game mode is unavailable', () => {
    expect(presentGameMode(null)).toBeNull();
  });
});
