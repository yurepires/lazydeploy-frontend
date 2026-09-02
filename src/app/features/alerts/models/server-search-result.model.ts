export interface ServerSearchResult {
  readonly guid: string;
  readonly displayName: string;
  readonly mapId?: string;
  readonly mapDisplayName?: string;
  readonly players?: number;
  readonly maxPlayers?: number;
  readonly queue?: number;
  readonly gameMode?: string;
}
