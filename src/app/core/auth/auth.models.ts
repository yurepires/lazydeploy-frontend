export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
}

export interface RegistrationResponse {
  readonly email: string;
  readonly verificationRequired: boolean;
  readonly verificationExpiresAt: string;
}

export interface ConfirmEmailVerificationRequest {
  readonly email: string;
  readonly code: string;
}

export interface ResendEmailVerificationRequest {
  readonly email: string;
}
