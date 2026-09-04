import { CurrentMap } from './current-map.model';
import { CurrentPlayers } from './current-players.model';

export interface CurrentServerStatus {
  readonly available: boolean;
  readonly availabilityReason: string | null;
  readonly map: CurrentMap | null;
  readonly players: CurrentPlayers | null;
  readonly gameMode: string | null;
  readonly lastObservedAt: string | null;
  readonly capturedAt: string | null;
}
