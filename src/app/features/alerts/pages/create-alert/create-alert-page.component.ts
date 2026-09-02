import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, finalize, map, of, switchMap } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorService } from '../../../../core/http/api-error.service';
import { SubscriptionService } from '../../../dashboard/data-access/subscription.service';
import { MapSelectionComponent } from '../../components/map-selection/map-selection.component';
import { ServerSearchResultCardComponent } from '../../components/server-search-result-card/server-search-result-card.component';
import { MapCatalogService } from '../../data-access/map-catalog.service';
import { ServerDiscoveryService } from '../../data-access/server-discovery.service';
import { BattlefieldMap } from '../../models/battlefield-map.model';
import { ConfigureSubscriptionRequest } from '../../models/configure-subscription-request.model';
import { ServerSearchResult } from '../../models/server-search-result.model';

type CreateAlertStep = 1 | 2 | 3 | 4;

interface WizardStep {
  readonly index: CreateAlertStep;
  readonly id: string;
  readonly label: string;
}

const MINIMUM_SEARCH_LENGTH = 2;
const MAXIMUM_PLAYERS = 2_147_483_647;

@Component({
  selector: 'app-create-alert-page',
  standalone: true,
  imports: [
    MatButton,
    MatCheckbox,
    MatError,
    MatFormField,
    MatHint,
    MatIcon,
    MatInput,
    MatLabel,
    MatProgressSpinner,
    MapSelectionComponent,
    ReactiveFormsModule,
    RouterLink,
    ServerSearchResultCardComponent,
  ],
  templateUrl: './create-alert-page.component.html',
  styleUrl: './create-alert-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAlertPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly mapCatalogService = inject(MapCatalogService);
  private readonly serverDiscoveryService = inject(ServerDiscoveryService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly serverSearchQuery = new Subject<string>();

  readonly steps: readonly WizardStep[] = [
    { index: 1, id: 'server', label: 'Servidor' },
    { index: 2, id: 'conditions', label: 'Condições' },
    { index: 3, id: 'notifications', label: 'Notificação' },
    { index: 4, id: 'review', label: 'Revisar' },
  ];

  readonly currentStep = signal<CreateAlertStep>(1);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly serverQuery = signal('');
  readonly serverResults = signal<ServerSearchResult[]>([]);
  readonly searchingServers = signal(false);
  readonly serverSearchStarted = signal(false);
  readonly serverSearchError = signal<string | null>(null);
  readonly selectedServer = signal<ServerSearchResult | null>(null);

  readonly maps = signal<BattlefieldMap[]>([]);
  readonly mapsLoading = signal(false);
  readonly mapsLoaded = signal(false);
  readonly mapsError = signal<string | null>(null);
  readonly selectedMapIds = signal<string[]>([]);

  readonly accountEmail = computed(
    () => this.authService.currentUser()?.email ?? 'Email da conta indisponível',
  );
  readonly selectedMapDisplayNames = computed(() => {
    const selectedIds = new Set(this.selectedMapIds());

    return this.maps()
      .filter((mapItem) => selectedIds.has(mapItem.id))
      .map((mapItem) => mapItem.displayName);
  });
  readonly currentStepLabel = computed(() => {
    const step = this.steps.find((candidate) => candidate.index === this.currentStep());

    return step?.label ?? 'Servidor';
  });
  readonly submitActionIcon = computed(() => {
    if (this.submitting()) {
      return 'hourglass_top';
    }

    return 'add_alert';
  });

  readonly alertForm = this.formBuilder.group({
    server: this.formBuilder.group({
      selectedServer: this.formBuilder.control<ServerSearchResult | null>(null, {
        validators: [Validators.required],
      }),
    }),
    conditions: this.formBuilder.group({
      mapIds: this.formBuilder.control<string[]>([], {
        nonNullable: true,
        validators: [atLeastOneSelectedValidator()],
      }),
      minimumPlayers: this.formBuilder.control<number | null>(40, {
        validators: [
          Validators.required,
          Validators.min(0),
          Validators.max(MAXIMUM_PLAYERS),
          wholeNumberValidator(),
        ],
      }),
    }),
    notifications: this.formBuilder.group(
      {
        emailEnabled: this.formBuilder.nonNullable.control(true),
      },
      { validators: activeNotificationChannelValidator() },
    ),
  });

  get serverGroup() {
    return this.alertForm.controls.server;
  }

  get conditionsGroup() {
    return this.alertForm.controls.conditions;
  }

  get notificationsGroup() {
    return this.alertForm.controls.notifications;
  }

  get minimumPlayersControl() {
    return this.conditionsGroup.controls.minimumPlayers;
  }

  ngOnInit(): void {
    this.setupServerSearch();
    this.authService.loadCurrentUser().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  onServerQueryInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    if (!target) {
      return;
    }

    const query = target.value;
    this.serverQuery.set(query);
    this.serverSearchQuery.next(query);
  }

  retryServerSearch(): void {
    this.serverSearchError.set(null);
    this.serverSearchQuery.next(this.serverQuery());
  }

  selectServer(server: ServerSearchResult): void {
    this.selectedServer.set(server);
    this.serverGroup.controls.selectedServer.setValue(server);
    this.serverGroup.controls.selectedServer.markAsDirty();
    this.submitError.set(null);
  }

  clearSelectedServer(): void {
    this.selectedServer.set(null);
    this.serverGroup.controls.selectedServer.setValue(null);
    this.serverGroup.controls.selectedServer.markAsDirty();
  }

  onMapSelectionChanged(mapIds: string[]): void {
    const uniqueMapIds = Array.from(new Set(mapIds));

    this.selectedMapIds.set(uniqueMapIds);
    this.conditionsGroup.controls.mapIds.setValue(uniqueMapIds);
    this.conditionsGroup.controls.mapIds.markAsDirty();
    this.conditionsGroup.controls.mapIds.markAsTouched();
  }

  retryMapLoading(): void {
    this.mapsLoaded.set(false);
    this.loadMaps();
  }

  nextStep(): void {
    if (this.submitting() || !this.validateCurrentStep()) {
      return;
    }

    const nextStep = (this.currentStep() + 1) as CreateAlertStep;

    if (nextStep === 2) {
      this.loadMaps();
    }

    this.currentStep.set(nextStep);
  }

  previousStep(): void {
    if (this.submitting() || this.currentStep() === 1) {
      return;
    }

    this.currentStep.set((this.currentStep() - 1) as CreateAlertStep);
  }

  goToStep(step: CreateAlertStep): void {
    if (this.submitting() || step >= this.currentStep()) {
      return;
    }

    this.currentStep.set(step);
  }

  isStepCompleted(step: CreateAlertStep): boolean {
    return step < this.currentStep();
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    this.alertForm.markAllAsTouched();

    if (this.alertForm.invalid) {
      this.goToFirstInvalidStep();
      return;
    }

    const request = this.toConfigureRequest();

    if (!request) {
      this.goToFirstInvalidStep();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    this.subscriptionService
      .configure(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Alerta criado com sucesso.', 'Fechar', {
            duration: 3500,
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
          });
          void this.router.navigate(['/dashboard']);
        },
        error: (error: unknown) => {
          this.submitError.set(this.apiErrorService.messageFor(error));
        },
      });
  }

  private setupServerSearch(): void {
    this.serverSearchQuery
      .pipe(
        debounceTime(350),
        map((query) => query.trim()),
        switchMap((query) => {
          this.serverSearchStarted.set(query.length >= MINIMUM_SEARCH_LENGTH);
          this.serverSearchError.set(null);

          if (query.length < MINIMUM_SEARCH_LENGTH) {
            this.searchingServers.set(false);
            return of<ServerSearchResult[]>([]);
          }

          this.searchingServers.set(true);

          return this.serverDiscoveryService.search(query).pipe(
            catchError((error: unknown) => {
              this.serverSearchError.set(this.apiErrorService.messageFor(error));
              return of<ServerSearchResult[]>([]);
            }),
            finalize(() => this.searchingServers.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => this.serverResults.set(results));
  }

  private loadMaps(): void {
    if (this.mapsLoaded() || this.mapsLoading()) {
      return;
    }

    this.mapsLoading.set(true);
    this.mapsError.set(null);

    this.mapCatalogService
      .list()
      .pipe(finalize(() => this.mapsLoading.set(false)))
      .subscribe({
        next: (maps) => {
          this.maps.set(maps);
          this.mapsLoaded.set(true);
        },
        error: (error: unknown) => {
          this.mapsError.set(this.apiErrorService.messageFor(error));
        },
      });
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep()) {
      case 1:
        this.serverGroup.markAllAsTouched();
        return this.serverGroup.valid;
      case 2:
        this.conditionsGroup.markAllAsTouched();
        return this.conditionsGroup.valid;
      case 3:
        this.notificationsGroup.markAllAsTouched();
        return this.notificationsGroup.valid;
      case 4:
        return this.alertForm.valid;
    }
  }

  private goToFirstInvalidStep(): void {
    if (this.serverGroup.invalid) {
      this.currentStep.set(1);
      return;
    }

    if (this.conditionsGroup.invalid) {
      this.currentStep.set(2);
      this.loadMaps();
      return;
    }

    if (this.notificationsGroup.invalid) {
      this.currentStep.set(3);
    }
  }

  private toConfigureRequest(): ConfigureSubscriptionRequest | null {
    const server = this.serverGroup.controls.selectedServer.value;
    const minimumPlayers = this.minimumPlayersControl.value;

    if (!server || minimumPlayers === null) {
      return null;
    }

    return {
      serverGuid: server.guid,
      displayName: server.displayName,
      enabled: true,
      rules: [
        {
          type: 'MAP_IN',
          enabled: true,
          parameters: {
            values: [...this.selectedMapIds()],
          },
        },
        {
          type: 'PLAYER_COUNT_AT_LEAST',
          enabled: true,
          parameters: {
            value: minimumPlayers,
          },
        },
      ],
      channels: [
        {
          type: 'EMAIL',
          enabled: this.notificationsGroup.controls.emailEnabled.value,
        },
      ],
    };
  }
}

function atLeastOneSelectedValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const values = control.value;

    if (Array.isArray(values) && values.length > 0) {
      return null;
    }

    return { atLeastOneSelected: true };
  };
}

function wholeNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === '') {
      return null;
    }

    if (typeof value === 'number' && Number.isInteger(value)) {
      return null;
    }

    return { integer: true };
  };
}

function activeNotificationChannelValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const emailEnabled = control.get('emailEnabled')?.value;

    if (emailEnabled === true) {
      return null;
    }

    return { noActiveChannel: true };
  };
}
