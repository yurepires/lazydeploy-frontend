import {
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorService } from '../../../../core/http/api-error.service';
import { ApiProblemDetail } from '../../../../core/http/api-problem-detail.model';
import { BrandMarkComponent } from '../../../../shared/components/brand-mark/brand-mark.component';

const RESEND_COOLDOWN_SECONDS = 60;
const VERIFICATION_CODE_LENGTH = 6;

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [
    BrandMarkComponent,
    MatButton,
    MatIcon,
    MatProgressSpinner,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './verify-email-page.component.html',
  styleUrl: './verify-email-page.component.scss',
})
export class VerifyEmailPageComponent implements OnDestroy {
  @ViewChildren('codeInput')
  private codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly apiErrorService = inject(ApiErrorService);
  private countdownTimer: number | null = null;
  readonly pendingEmail = this.authService.pendingVerificationEmail();

  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  readonly codeDigits = signal<string[]>(this.emptyCodeDigits());
  readonly confirming = signal(false);
  readonly resending = signal(false);
  readonly confirmed = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly resendCountdown = signal(this.pendingEmail ? RESEND_COOLDOWN_SECONDS : 0);

  constructor() {
    if (this.pendingEmail) {
      this.startCountdown();
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  get codeControl() {
    return this.form.controls.code;
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

    if (numericValue && index < VERIFICATION_CODE_LENGTH - 1) {
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
    if (event.key === 'ArrowRight' && index < VERIFICATION_CODE_LENGTH - 1) {
      event.preventDefault();
      this.focusInput(index + 1);
    }
  }

  handlePaste(event: ClipboardEvent): void {
    const pastedCode = event.clipboardData?.getData('text') ?? '';
    const numericCode = pastedCode.replace(/\D/g, '').slice(0, VERIFICATION_CODE_LENGTH);
    if (!numericCode) {
      return;
    }

    event.preventDefault();
    this.applyCompleteCode(numericCode);
  }

  confirm(): void {
    this.form.markAllAsTouched();
    if (!this.pendingEmail || this.form.invalid || this.confirming() || this.confirmed()) {
      return;
    }
    this.confirming.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.authService
      .confirmEmail({ email: this.pendingEmail, code: this.codeControl.value })
      .subscribe({
        next: () => {
          this.confirming.set(false);
          this.confirmed.set(true);
          this.authService.clearPendingVerificationEmail();
          this.stopCountdown();
        },
        error: (error: ApiProblemDetail) => {
          this.confirming.set(false);
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
    this.authService.resendEmailVerification({ email: this.pendingEmail }).subscribe({
      next: () => {
        this.resending.set(false);
        this.successMessage.set(
          'Se houver um cadastro pendente, um novo código será enviado para este email.',
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

  private applyCompleteCode(value: string): void {
    const normalizedCode = value.replace(/\D/g, '').slice(0, VERIFICATION_CODE_LENGTH);
    const digits = this.emptyCodeDigits();
    normalizedCode.split('').forEach((digit, index) => {
      digits[index] = digit;
    });
    this.updateCode(digits);

    const nextInputIndex = Math.min(normalizedCode.length, VERIFICATION_CODE_LENGTH - 1);
    this.focusInput(nextInputIndex);
  }

  private updateCode(digits: string[]): void {
    this.codeDigits.set(digits);
    this.codeControl.setValue(digits.join(''));
  }

  private emptyCodeDigits(): string[] {
    return Array.from({ length: VERIFICATION_CODE_LENGTH }, () => '');
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
