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

export interface ChangePasswordRequest {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export interface RequestPasswordRecoveryRequest {
  readonly email: string;
}

export interface VerifyPasswordRecoveryRequest {
  readonly email: string;
  readonly code: string;
}

export interface PasswordResetGrantResponse {
  readonly resetToken: string;
  readonly expiresAt: string;
}

export interface CompletePasswordRecoveryRequest {
  readonly resetToken: string;
  readonly newPassword: string;
}
