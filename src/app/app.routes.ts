import { Routes } from '@angular/router';

import { AppShellComponent } from './core/layout/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login-page.component').then(
        ({ LoginPageComponent }) => LoginPageComponent,
      ),
  },
  {
    path: 'register',
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
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard-page.component').then(
            ({ DashboardPageComponent }) => DashboardPageComponent,
          ),
      },
      {
        path: 'alerts/new',
        loadComponent: () =>
          import('./features/alerts/pages/create-alert/create-alert-page.component').then(
            ({ CreateAlertPageComponent }) => CreateAlertPageComponent,
          ),
      },
      {
        path: 'alerts/:id/edit',
        loadComponent: () =>
          import('./features/alerts/pages/edit-alert/edit-alert-page.component').then(
            ({ EditAlertPageComponent }) => EditAlertPageComponent,
          ),
      },
      {
        path: 'alerts/:id',
        loadComponent: () =>
          import('./features/alerts/pages/alert-details/alert-details-page.component').then(
            ({ AlertDetailsPageComponent }) => AlertDetailsPageComponent,
          ),
      },
      {
        path: 'history',
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
