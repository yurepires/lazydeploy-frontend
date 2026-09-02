import { CanDeactivateFn, GuardResult, MaybeAsync } from '@angular/router';

export interface PendingAlertChangesComponent {
  canDeactivate: () => MaybeAsync<GuardResult>;
}

export const pendingAlertChangesGuard: CanDeactivateFn<PendingAlertChangesComponent> = (
  component,
) => component.canDeactivate();
