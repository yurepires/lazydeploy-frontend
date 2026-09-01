export interface SubscriptionSummary {
  readonly id: string;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly server: ServerSummary;
  readonly rules: RuleSummary[];
  readonly channels: ChannelSummary[];
}

export interface ServerSummary {
  readonly id: string;
  readonly guid: string;
  readonly displayName: string;
}

export interface RuleSummary {
  readonly id: string;
  readonly type: string;
  readonly enabled: boolean;
  readonly parameters: Record<string, unknown>;
}

export interface ChannelSummary {
  readonly id: string;
  readonly type: string;
  readonly enabled: boolean;
}

export interface UpdateSubscriptionRequest {
  readonly enabled: boolean | undefined;
}
