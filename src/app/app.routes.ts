import { Routes } from '@angular/router';

import { AppShellComponent } from './core/layout/app-shell.component';
import { authGuard, rootRedirectGuard } from './core/guards/auth.guard';
import { pendingAlertChangesGuard } from './core/guards/pending-alert-changes.guard';
import { guestGuard as guestRouteGuard } from './core/guards/guest.guard';
import { RootRedirectComponent } from './core/routing/root-redirect.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: RootRedirectComponent,
    canActivate: [rootRedirectGuard],
  },
  {
    path: 'login',
    canActivate: [guestRouteGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login-page.component').then(
        ({ LoginPageComponent }) => LoginPageComponent,
      ),
  },
  {
    path: 'register',
    canActivate: [guestRouteGuard],
    loadComponent: () =>
      import('./features/auth/pages/register/register-page.component').then(
        ({ RegisterPageComponent }) => RegisterPageComponent,
      ),
  },
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard-page.component').then(
            ({ DashboardPageComponent }) => DashboardPageComponent,
          ),
      },
      {
        path: 'alerts/new',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/alerts/pages/create-alert/create-alert-page.component').then(
            ({ CreateAlertPageComponent }) => CreateAlertPageComponent,
          ),
      },
      {
        path: 'alerts/:id/edit',
        canActivate: [authGuard],
        canDeactivate: [pendingAlertChangesGuard],
        loadComponent: () =>
          import('./features/alerts/pages/edit-alert/edit-alert-page.component').then(
            ({ EditAlertPageComponent }) => EditAlertPageComponent,
          ),
      },
      {
        path: 'alerts/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/alerts/pages/alert-details/alert-details-page.component').then(
            ({ AlertDetailsPageComponent }) => AlertDetailsPageComponent,
          ),
      },
      {
        path: 'history',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/history/pages/history/history-page.component').then(
            ({ HistoryPageComponent }) => HistoryPageComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/pages/not-found/not-found-page.component').then(
        ({ NotFoundPageComponent }) => NotFoundPageComponent,
      ),
  },
];
