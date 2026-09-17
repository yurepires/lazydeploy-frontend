import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';

import { ApiClientService } from '../http/api-client.service';
import { ApiErrorService } from '../http/api-error.service';
import { ApiProblemDetail } from '../http/api-problem-detail.model';
import { CurrentUser } from '../../shared/models/current-user.model';

import {
  ConfirmEmailVerificationRequest,
  LoginRequest,
  RegisterRequest,
  RegistrationResponse,
  ResendEmailVerificationRequest,
} from './auth.models';

const PENDING_VERIFICATION_EMAIL_KEY = 'lazydeploy.pending-verification-email';

interface AuthenticatedUserResponse {
  readonly id: string;
  readonly email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiClient = inject(ApiClientService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly router = inject(Router);

  private readonly currentUserSignal = signal<CurrentUser | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly initializedSignal = signal(false);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly authenticated = computed(() => this.currentUser() !== null);
  readonly loading = this.loadingSignal.asReadonly();
  readonly initialized = this.initializedSignal.asReadonly();

  private currentUserRequest$: Observable<CurrentUser | null> | null = null;

  loadCurrentUser(): Observable<CurrentUser | null> {
    if (this.initialized()) {
      return of(this.currentUser());
    }

    if (this.currentUserRequest$) {
      return this.currentUserRequest$;
    }

    this.loadingSignal.set(true);
    this.currentUserRequest$ = this.apiClient.get<CurrentUser>('/auth/me').pipe(
      tap((user) => this.currentUserSignal.set(user)),
      catchError(() => {
        this.currentUserSignal.set(null);
        return of(null);
      }),
      finalize(() => {
        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
        this.currentUserRequest$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    return this.currentUserRequest$;
  }

  login(request: LoginRequest): Observable<CurrentUser> {
    this.loadingSignal.set(true);

    return this.apiClient
      .post<AuthenticatedUserResponse, LoginRequest>('/auth/login', request)
      .pipe(
        map((response) => this.toCurrentUser(response)),
        tap((user) => this.currentUserSignal.set(user)),
        tap(() => this.clearPendingVerificationEmail()),
        tap(() => this.initializedSignal.set(true)),
        catchError((error: unknown) => this.toApiProblem(error)),
        finalize(() => this.loadingSignal.set(false)),
      );
  }

  register(request: RegisterRequest): Observable<RegistrationResponse> {
    this.loadingSignal.set(true);

    return this.apiClient
      .post<RegistrationResponse, RegisterRequest>('/auth/register', request)
      .pipe(
        tap((response) => this.rememberPendingVerificationEmail(response.email)),
        catchError((error: unknown) => this.toApiProblem(error)),
        finalize(() => this.loadingSignal.set(false)),
      );
  }

  confirmEmail(request: ConfirmEmailVerificationRequest): Observable<void> {
    return this.apiClient
      .post<void, ConfirmEmailVerificationRequest>('/auth/email-verification/confirm', request)
      .pipe(catchError((error: unknown) => this.toApiProblem(error)));
  }

  resendEmailVerification(request: ResendEmailVerificationRequest): Observable<void> {
    return this.apiClient
      .post<void, ResendEmailVerificationRequest>('/auth/email-verification/resend', request)
      .pipe(catchError((error: unknown) => this.toApiProblem(error)));
  }

  rememberPendingVerificationEmail(email: string): void {
    sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email.trim().toLowerCase());
  }

  pendingVerificationEmail(): string | null {
    return sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
  }

  clearPendingVerificationEmail(): void {
    sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
  }

  logout(): Observable<void> {
    this.loadingSignal.set(true);

    return this.apiClient.post<void, null>('/auth/logout', null).pipe(
      catchError((error: unknown) => this.toApiProblem(error)),
      finalize(() => {
        this.clearCurrentUser();
        this.loadingSignal.set(false);
        void this.router.navigate(['/login']);
      }),
    );
  }

  clearCurrentUser(): void {
    this.currentUserSignal.set(null);
  }

  private toCurrentUser(response: AuthenticatedUserResponse): CurrentUser {
    return {
      id: response.id,
      email: response.email,
    };
  }

  private toApiProblem(error: unknown): Observable<never> {
    const problemDetail: ApiProblemDetail = this.apiErrorService.toProblemDetail(error);

    return throwError(() => problemDetail);
  }
}
