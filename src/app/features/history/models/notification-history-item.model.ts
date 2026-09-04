export interface NotificationHistoryServer {
  readonly id: string | null;
  readonly displayName: string | null;
}

export interface NotificationHistoryMap {
  readonly id: string | null;
  readonly displayName: string | null;
}

export interface NotificationHistoryPlayers {
  readonly current: number | null;
  readonly maximum: number | null;
}

export interface NotificationHistoryItem {
  readonly id: string;
  readonly subscriptionId: string | null;
  readonly server: NotificationHistoryServer;
  readonly roundInstanceId: string | null;
  readonly map: NotificationHistoryMap;
  readonly players: NotificationHistoryPlayers;
  readonly gameMode: string | null;
  readonly channelType: string | null;
  readonly status: string | null;
  readonly attemptedAt: string;
  readonly sentAt: string | null;
}

export interface NotificationHistoryDetails extends NotificationHistoryItem {
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
}
