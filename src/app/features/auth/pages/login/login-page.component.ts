import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorService } from '../../../../core/http/api-error.service';
import { ApiProblemDetail } from '../../../../core/http/api-problem-detail.model';
import { BrandMarkComponent } from '../../../../shared/components/brand-mark/brand-mark.component';

@Component({
  selector: 'app-login-page',
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
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly registrationCompleted = toSignal(
    this.activatedRoute.queryParamMap.pipe(
      map((queryParams) => queryParams.get('registered') === 'true'),
    ),
    { initialValue: false },
  );
  readonly passwordVisible = signal(false);

  get emailControl() {
    return this.form.controls.email;
  }

  get passwordControl() {
    return this.form.controls.password;
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  fieldErrorFor(fieldName: string): string | null {
    return this.fieldErrors()[fieldName] ?? null;
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl('/dashboard');
      },
      error: (error: ApiProblemDetail) => {
        this.submitting.set(false);
        this.errorMessage.set(this.apiErrorService.messageFor(error));
        this.fieldErrors.set({
          email: this.apiErrorService.fieldMessageFor(error, 'email') ?? '',
          password: this.apiErrorService.fieldMessageFor(error, 'password') ?? '',
        });
      },
    });
  }
}
