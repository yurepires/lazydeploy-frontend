export interface BattlefieldMap {
  readonly id: string;
  readonly displayName: string;
  readonly enabled: boolean;
  readonly expansion?: string | null;
}
