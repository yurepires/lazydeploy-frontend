import { presentServerStatusTime } from './server-status-time-presenter';

describe('presentServerStatusTime', () => {
  const now = new Date('2026-09-02T23:45:00Z');

  it('should render never observed when timestamp is missing', () => {
    expect(presentServerStatusTime(null, now)).toBe('Nunca observado.');
  });

  it('should render seconds as now', () => {
    expect(presentServerStatusTime('2026-09-02T23:44:42Z', now)).toBe('Agora.');
  });

  it('should render elapsed minutes', () => {
    expect(presentServerStatusTime('2026-09-02T23:42:00Z', now)).toBe('Há 3 min.');
  });

  it('should render elapsed hours', () => {
    expect(presentServerStatusTime('2026-09-02T20:45:00Z', now)).toBe('Há 3 h.');
  });
});
