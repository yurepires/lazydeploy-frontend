import {
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorService } from '../../../../core/http/api-error.service';
import { ApiProblemDetail } from '../../../../core/http/api-problem-detail.model';
import { BrandMarkComponent } from '../../../../shared/components/brand-mark/brand-mark.component';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [
    BrandMarkComponent,
    MatButton,
    MatError,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatProgressSpinner,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
})
export class ResetPasswordPageComponent implements OnDestroy {
  @ViewChildren('codeInput')
  private codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly router = inject(Router);
  private countdownTimer: number | null = null;
  private resetToken: string | null = null;

  readonly pendingEmail = this.authService.pendingPasswordRecoveryEmail();
  readonly phase = signal<'code' | 'password'>('code');
  readonly codeForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );
  readonly codeDigits = signal<string[]>(this.emptyCodeDigits());
  readonly verifying = signal(false);
  readonly completing = signal(false);
  readonly resending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly resendCountdown = signal(this.pendingEmail ? RESEND_COOLDOWN_SECONDS : 0);
  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);

  constructor() {
    if (this.pendingEmail) {
      this.startCountdown();
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  get codeControl() {
    return this.codeForm.controls.code;
  }

  get newPasswordControl() {
    return this.passwordForm.controls.newPassword;
  }

  get confirmPasswordControl() {
    return this.passwordForm.controls.confirmPassword;
  }

  get shouldShowPasswordMismatch(): boolean {
    const confirmationWasEdited =
      this.confirmPasswordControl.dirty || this.confirmPasswordControl.touched;
    return confirmationWasEdited && this.passwordForm.hasError('passwordMismatch');
  }

  updateDigit(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const numericValue = input.value.replace(/\D/g, '');
    if (numericValue.length > 1) {
      this.applyCompleteCode(numericValue);
      return;
    }

    const digits = [...this.codeDigits()];
    digits[index] = numericValue;
    this.updateCode(digits);
    if (numericValue && index < CODE_LENGTH - 1) {
      this.focusInput(index + 1);
    }
  }

  handleKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.codeDigits()[index] && index > 0) {
      this.focusInput(index - 1);
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusInput(index - 1);
      return;
    }
    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault();
      this.focusInput(index + 1);
    }
  }

  handlePaste(event: ClipboardEvent): void {
    const pastedCode = event.clipboardData?.getData('text') ?? '';
    const numericCode = pastedCode.replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!numericCode) {
      return;
    }
    event.preventDefault();
    this.applyCompleteCode(numericCode);
  }

  verifyCode(): void {
    this.codeForm.markAllAsTouched();
    if (!this.pendingEmail || this.codeForm.invalid || this.verifying()) {
      return;
    }

    this.verifying.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.authService
      .verifyPasswordRecovery({ email: this.pendingEmail, code: this.codeControl.value })
      .subscribe({
        next: (response) => {
          this.verifying.set(false);
          this.resetToken = response.resetToken;
          this.authService.clearPendingPasswordRecoveryEmail();
          this.stopCountdown();
          this.phase.set('password');
        },
        error: (error: ApiProblemDetail) => {
          this.verifying.set(false);
          this.errorMessage.set(this.apiErrorService.messageFor(error));
        },
      });
  }

  resend(): void {
    if (!this.pendingEmail || this.resending() || this.resendCountdown() > 0) {
      return;
    }

    this.resending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.authService.requestPasswordRecovery({ email: this.pendingEmail }).subscribe({
      next: () => {
        this.resending.set(false);
        this.successMessage.set(
          'Se a conta estiver disponível para recuperação, um novo código será enviado.',
        );
        this.updateCode(this.emptyCodeDigits());
        this.codeControl.markAsUntouched();
        this.resendCountdown.set(RESEND_COOLDOWN_SECONDS);
        this.startCountdown();
      },
      error: (error: ApiProblemDetail) => {
        this.resending.set(false);
        this.errorMessage.set(this.apiErrorService.messageFor(error));
      },
    });
  }

  complete(): void {
    this.passwordForm.markAllAsTouched();
    if (!this.resetToken || this.passwordForm.invalid || this.completing()) {
      return;
    }

    this.completing.set(true);
    this.errorMessage.set(null);
    const { newPassword } = this.passwordForm.getRawValue();
    this.authService
      .completePasswordRecovery({ resetToken: this.resetToken, newPassword })
      .subscribe({
        next: () => {
          this.completing.set(false);
          this.resetToken = null;
          void this.router.navigate(['/login'], { queryParams: { passwordReset: 'true' } });
        },
        error: (error: ApiProblemDetail) => {
          this.completing.set(false);
          this.errorMessage.set(this.apiErrorService.messageFor(error));
        },
      });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
  }

  private applyCompleteCode(value: string): void {
    const normalizedCode = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    const digits = this.emptyCodeDigits();
    normalizedCode.split('').forEach((digit, index) => {
      digits[index] = digit;
    });
    this.updateCode(digits);
    this.focusInput(Math.min(normalizedCode.length, CODE_LENGTH - 1));
  }

  private updateCode(digits: string[]): void {
    this.codeDigits.set(digits);
    this.codeControl.setValue(digits.join(''));
  }

  private emptyCodeDigits(): string[] {
    return Array.from({ length: CODE_LENGTH }, () => '');
  }

  private focusInput(index: number): void {
    this.codeInputs.get(index)?.nativeElement.focus();
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.countdownTimer = window.setInterval(() => {
      const remainingSeconds = this.resendCountdown();
      if (remainingSeconds <= 1) {
        this.resendCountdown.set(0);
        this.stopCountdown();
      } else {
        this.resendCountdown.set(remainingSeconds - 1);
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) {
      window.clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirmation = control.get('confirmPassword')?.value;
  if (!password || !confirmation || password === confirmation) {
    return null;
  }
  return { passwordMismatch: true };
}
