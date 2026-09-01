import { routes } from './app.routes';
import { AppShellComponent } from './core/layout/app-shell.component';

describe('application routes', () => {
  it('protects the root route with an authentication-aware redirect', () => {
    const rootRoute = routes.find((route) => route.path === '' && route.pathMatch === 'full');

    expect(rootRoute?.canActivate?.length).toBeGreaterThan(0);
    expect(rootRoute?.component).toBeTruthy();
  });

  it('defines the initial public and workspace paths', () => {
    const routePaths = routes.map((route) => route.path);
    const workspaceRoute = routes.find((route) => route.component === AppShellComponent);

    expect(routePaths).toEqual(expect.arrayContaining(['login', 'register', '**']));
    expect(workspaceRoute?.children?.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        'dashboard',
        'alerts/new',
        'alerts/:id',
        'alerts/:id/edit',
        'history',
      ]),
    );
  });
});
