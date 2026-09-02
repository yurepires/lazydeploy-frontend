export interface ConfigureSubscriptionRequest {
  readonly serverGuid: string;
  readonly displayName: string;
  readonly enabled: boolean;
  readonly rules: ConfigureRuleRequest[];
  readonly channels: ConfigureChannelRequest[];
}

export interface ConfigureRuleRequest {
  readonly type: string;
  readonly enabled: boolean;
  readonly parameters: Record<string, unknown>;
}

export interface ConfigureChannelRequest {
  readonly type: string;
  readonly enabled: boolean;
}

export interface ConfiguredSubscriptionResponse {
  readonly id: string;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly server: ConfiguredServerReference;
  readonly rules: ConfiguredRule[];
  readonly channels: ConfiguredChannel[];
}

export interface ConfiguredServerReference {
  readonly id: string;
  readonly guid: string;
  readonly displayName: string;
}

export interface ConfiguredRule {
  readonly id: string;
  readonly type: string;
  readonly enabled: boolean;
  readonly parameters: Record<string, unknown>;
}

export interface ConfiguredChannel {
  readonly id: string;
  readonly type: string;
  readonly enabled: boolean;
}
