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
import { MatDialog } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  throwError,
} from 'rxjs';

import { PendingAlertChangesComponent } from '../../../../core/guards/pending-alert-changes.guard';
import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorService } from '../../../../core/http/api-error.service';
import { DiscardAlertChangesDialogComponent } from '../../components/discard-alert-changes-dialog/discard-alert-changes-dialog.component';
import { MapSelectionComponent } from '../../components/map-selection/map-selection.component';
import { MapCatalogService } from '../../data-access/map-catalog.service';
import { BattlefieldMap } from '../../models/battlefield-map.model';
import { SubscriptionService } from '../../../dashboard/data-access/subscription.service';
import {
  RuleSummary,
  SubscriptionSummary,
  UpdateRuleRequest,
} from '../../../dashboard/models/subscription-summary.model';
import { minimumPlayersFromRule } from '../../../dashboard/utils/subscription-rule-presenter';

const MAXIMUM_PLAYERS = 2_147_483_647;
const PARTIAL_SAVE_MESSAGE =
  'Algumas alterações não puderam ser salvas. O alerta foi recarregado com o estado atual.';

type LoadResult =
  | {
      readonly type: 'success';
      readonly subscription: SubscriptionSummary;
      readonly maps: BattlefieldMap[];
      readonly mapIds: string[];
      readonly minimumPlayers: number;
    }
  | { readonly type: 'not-found' }
  | { readonly type: 'invalid-configuration' }
  | { readonly type: 'invalid-id' }
  | { readonly type: 'error'; readonly message: string };

interface RuleConfiguration {
  readonly mapIds: string[];
  readonly minimumPlayers: number;
}

@Component({
  selector: 'app-edit-alert-page',
  standalone: true,
  imports: [
    MatButton,
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
  ],
  templateUrl: './edit-alert-page.component.html',
  styleUrl: './edit-alert-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditAlertPageComponent implements OnInit, PendingAlertChangesComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly mapCatalogService = inject(MapCatalogService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loadRequests = new Subject<string | null>();

  readonly editAlertForm = this.formBuilder.group({
    conditions: this.formBuilder.group({
      mapIds: this.formBuilder.nonNullable.control<string[]>([], {
        validators: [atLeastOneSelectedValidator()],
      }),
      minimumPlayers: this.formBuilder.control<number | null>(null, {
        validators: [
          Validators.required,
          Validators.min(0),
          Validators.max(MAXIMUM_PLAYERS),
          wholeNumberValidator(),
        ],
      }),
    }),
  });

  readonly subscription = signal<SubscriptionSummary | null>(null);
  readonly maps = signal<BattlefieldMap[]>([]);
  readonly selectedMapIds = signal<string[]>([]);
  readonly minimumPlayers = signal<number | null>(null);
  readonly originalMapIds = signal<string[]>([]);
  readonly originalMinimumPlayers = signal<number | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly invalidConfiguration = signal(false);
  readonly currentSubscriptionId = signal<string | null>(null);

  readonly conditionsGroup = this.editAlertForm.controls.conditions;
  readonly minimumPlayersControl = this.conditionsGroup.controls.minimumPlayers;
  readonly accountEmail = computed(
    () => this.authService.currentUser()?.email ?? 'Email da conta indisponível',
  );

  readonly mapsChanged = computed(() => !sameMapSet(this.selectedMapIds(), this.originalMapIds()));
  readonly minimumPlayersChanged = computed(
    () => this.minimumPlayers() !== this.originalMinimumPlayers(),
  );
  readonly hasChanges = computed(() => this.mapsChanged() || this.minimumPlayersChanged());
  readonly busy = computed(() => this.loading() || this.saving());
  readonly selectableMaps = computed(() => this.mapsWithUnknownSelections());
  readonly statusLabel = computed(() => {
    if (this.subscription()?.enabled) {
      return 'Ativo';
    }

    return 'Desativado';
  });
  readonly statusIcon = computed(() => {
    if (this.subscription()?.enabled) {
      return 'notifications_active';
    }

    return 'notifications_off';
  });
  readonly saveButtonLabel = computed(() => {
    if (this.saving()) {
      return 'Salvando...';
    }

    return 'Salvar alterações';
  });

  ngOnInit(): void {
    this.listenForFormChanges();
    this.listenForLoadRequests();
    this.listenForRouteChanges();
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (this.saving()) {
      return false;
    }

    if (!this.hasChanges()) {
      return true;
    }

    const dialogRef = this.dialog.open(DiscardAlertChangesDialogComponent, {
      width: 'min(92vw, 30rem)',
      panelClass: 'glass-dialog-panel',
    });

    return dialogRef.afterClosed().pipe(map((confirmed) => confirmed === true));
  }

  retryLoad(): void {
    const subscriptionId = this.currentSubscriptionId();

    if (!subscriptionId || this.loading()) {
      return;
    }

    this.prepareForLoad();
    this.loadRequests.next(subscriptionId);
  }

  onMapSelectionChanged(mapIds: string[]): void {
    if (this.saving()) {
      return;
    }

    const uniqueMapIds = Array.from(new Set(mapIds));
    this.selectedMapIds.set(uniqueMapIds);
    this.conditionsGroup.controls.mapIds.setValue(uniqueMapIds);
    this.conditionsGroup.controls.mapIds.markAsDirty();
    this.conditionsGroup.controls.mapIds.markAsTouched();
  }

  onMinimumPlayersChanged(): void {
    this.minimumPlayers.set(this.minimumPlayersControl.value);
  }

  saveChanges(): void {
    if (this.saving()) {
      return;
    }

    this.editAlertForm.markAllAsTouched();

    if (this.editAlertForm.invalid || !this.hasChanges()) {
      return;
    }

    const currentSubscription = this.subscription();
    const mapRule = this.findRule(currentSubscription?.rules, 'MAP_IN');
    const playerRule = this.findRule(currentSubscription?.rules, 'PLAYER_COUNT_AT_LEAST');

    if (!currentSubscription || !mapRule || !playerRule) {
      this.invalidConfiguration.set(true);
      this.saveError.set('A configuração atual do alerta está incompleta ou inválida.');
      return;
    }

    const updates = this.createRuleUpdates(currentSubscription.id, mapRule, playerRule);

    if (updates.length === 0) {
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    forkJoin(updates)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.originalMapIds.set([...this.selectedMapIds()]);
          this.originalMinimumPlayers.set(this.minimumPlayers());
          this.showSuccess('Alterações salvas.');
          void this.router.navigate(['/alerts', currentSubscription.id]);
        },
        error: (error: unknown) => this.reloadAfterSaveFailure(error),
      });
  }

  goToDetails(): void {
    const subscriptionId = this.currentSubscriptionId();

    if (subscriptionId) {
      void this.router.navigate(['/alerts', subscriptionId]);
      return;
    }

    void this.router.navigate(['/dashboard']);
  }

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  private listenForFormChanges(): void {
    this.minimumPlayersControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.minimumPlayers.set(value));
  }

  private listenForRouteChanges(): void {
    this.route.paramMap
      .pipe(
        map((parameters) => parameters.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((subscriptionId) => {
        this.currentSubscriptionId.set(subscriptionId);
        this.prepareForLoad();
        this.loadRequests.next(subscriptionId);
      });
  }

  private listenForLoadRequests(): void {
    this.loadRequests
      .pipe(
        switchMap((subscriptionId) => this.fetchAlert(subscriptionId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.applyLoadResult(result));
  }

  private fetchAlert(subscriptionId: string | null): Observable<LoadResult> {
    if (!subscriptionId || subscriptionId.trim().length === 0) {
      return of<LoadResult>({ type: 'invalid-id' });
    }

    return this.subscriptionService.getById(subscriptionId).pipe(
      catchError((error: unknown) => {
        const problemDetail = this.apiErrorService.toProblemDetail(error);

        if (problemDetail.status === 404) {
          return of<SubscriptionSummary | null>(null);
        }

        return throwError(() => error);
      }),
      switchMap((subscription) => {
        if (!subscription) {
          return of<LoadResult>({ type: 'not-found' });
        }

        return this.mapCatalogService
          .list()
          .pipe(map((maps) => this.toLoadResult(subscription, maps)));
      }),
      catchError((error: unknown) => {
        return of<LoadResult>({
          type: 'error',
          message: this.apiErrorService.messageFor(error),
        });
      }),
    );
  }

  private toLoadResult(subscription: SubscriptionSummary, maps: BattlefieldMap[]): LoadResult {
    const ruleConfiguration = this.readRuleConfiguration(subscription.rules);

    if (!ruleConfiguration) {
      return { type: 'invalid-configuration' };
    }

    return {
      type: 'success',
      subscription,
      maps,
      ...ruleConfiguration,
    };
  }

  private readRuleConfiguration(rules: RuleSummary[]): RuleConfiguration | null {
    const mapRule = this.findRule(rules, 'MAP_IN');
    const playerRule = this.findRule(rules, 'PLAYER_COUNT_AT_LEAST');

    if (!mapRule || !playerRule) {
      return null;
    }

    const mapIds = readMapIds(mapRule);
    const minimumPlayers = minimumPlayersFromRule(playerRule);

    if (mapIds === null || minimumPlayers === null || !isValidMinimumPlayers(minimumPlayers)) {
      return null;
    }

    return {
      mapIds,
      minimumPlayers,
    };
  }

  private findRule(rules: RuleSummary[] | undefined, type: string): RuleSummary | null {
    if (!rules) {
      return null;
    }

    const matchingRules = rules.filter((rule) => rule.type.toUpperCase() === type);

    if (matchingRules.length !== 1) {
      return null;
    }

    return matchingRules[0];
  }

  private applyLoadResult(result: LoadResult): void {
    this.loading.set(false);

    switch (result.type) {
      case 'success':
        this.subscription.set(result.subscription);
        this.maps.set(result.maps);
        this.selectedMapIds.set([...result.mapIds]);
        this.originalMapIds.set([...result.mapIds]);
        this.minimumPlayers.set(result.minimumPlayers);
        this.originalMinimumPlayers.set(result.minimumPlayers);
        this.conditionsGroup.setValue(
          {
            mapIds: [...result.mapIds],
            minimumPlayers: result.minimumPlayers,
          },
          { emitEvent: false },
        );
        this.editAlertForm.markAsPristine();
        this.notFound.set(false);
        this.invalidConfiguration.set(false);
        this.loadError.set(null);
        this.saveError.set(null);
        this.updatePageTitle(result.subscription);
        return;
      case 'not-found':
      case 'invalid-id':
        this.clearLoadedState();
        this.notFound.set(true);
        this.title.setTitle('LazyDeploy | Alerta');
        return;
      case 'invalid-configuration':
        this.clearLoadedState();
        this.invalidConfiguration.set(true);
        this.title.setTitle('LazyDeploy | Editar alerta');
        return;
      case 'error':
        this.clearLoadedState();
        this.loadError.set(result.message);
        this.title.setTitle('LazyDeploy | Editar alerta');
        return;
    }
  }

  private clearLoadedState(): void {
    this.subscription.set(null);
    this.selectedMapIds.set([]);
    this.maps.set([]);
    this.originalMapIds.set([]);
    this.minimumPlayers.set(null);
    this.originalMinimumPlayers.set(null);
    this.conditionsGroup.reset({ mapIds: [], minimumPlayers: null }, { emitEvent: false });
    this.notFound.set(false);
    this.invalidConfiguration.set(false);
    this.loadError.set(null);
    this.saveError.set(null);
  }

  private prepareForLoad(): void {
    this.loading.set(true);
    this.clearLoadedState();
    this.title.setTitle('LazyDeploy | Editar alerta');
  }

  private createRuleUpdates(
    subscriptionId: string,
    mapRule: RuleSummary,
    playerRule: RuleSummary,
  ): Observable<RuleSummary>[] {
    const updates: Observable<RuleSummary>[] = [];

    if (this.mapsChanged()) {
      const request: UpdateRuleRequest = {
        type: mapRule.type,
        enabled: mapRule.enabled,
        parameters: {
          values: [...this.selectedMapIds()],
        },
      };
      updates.push(this.subscriptionService.updateRule(subscriptionId, mapRule.id, request));
    }

    if (this.minimumPlayersChanged()) {
      const minimumPlayers = this.minimumPlayers();

      if (minimumPlayers !== null) {
        const request: UpdateRuleRequest = {
          type: playerRule.type,
          enabled: playerRule.enabled,
          parameters: {
            value: minimumPlayers,
          },
        };
        updates.push(this.subscriptionService.updateRule(subscriptionId, playerRule.id, request));
      }
    }

    return updates;
  }

  private reloadAfterSaveFailure(originalError: unknown): void {
    const subscriptionId = this.currentSubscriptionId();

    if (!subscriptionId) {
      const message = this.apiErrorService.messageFor(originalError);
      this.saveError.set(message);
      this.showError(message);
      return;
    }

    this.subscriptionService
      .getById(subscriptionId)
      .pipe(
        switchMap((subscription) =>
          this.mapCatalogService.list().pipe(map((maps) => this.toLoadResult(subscription, maps))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.applyLoadResult(result);
          this.saveError.set(PARTIAL_SAVE_MESSAGE);
          this.showError(PARTIAL_SAVE_MESSAGE);
        },
        error: (reloadError: unknown) => {
          const message = this.apiErrorService.messageFor(reloadError);
          this.saveError.set(message);
          this.showError(message);
        },
      });
  }

  private mapsWithUnknownSelections(): BattlefieldMap[] {
    const knownMapIds = new Set(this.maps().map((mapItem) => mapItem.id));
    const unknownMaps = this.selectedMapIds()
      .filter((mapId) => !knownMapIds.has(mapId))
      .map((mapId) => ({
        id: mapId,
        displayName: `Mapa indisponível (${mapId})`,
        enabled: true,
        expansion: null,
      }));

    return [...this.maps(), ...unknownMaps];
  }

  private updatePageTitle(currentSubscription: SubscriptionSummary): void {
    this.title.setTitle(`LazyDeploy | Editar ${currentSubscription.server.displayName}`);
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 3500,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }
}

function readMapIds(rule: RuleSummary): string[] | null {
  if (!rule.parameters || typeof rule.parameters !== 'object') {
    return null;
  }

  const values = rule.parameters['values'];

  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const mapIds: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return null;
    }

    mapIds.push(value);
  }

  if (new Set(mapIds).size !== mapIds.length) {
    return null;
  }

  return mapIds;
}

function isValidMinimumPlayers(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAXIMUM_PLAYERS;
}

function sameMapSet(first: string[], second: string[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  const secondSet = new Set(second);

  return first.every((mapId) => secondSet.has(mapId));
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
