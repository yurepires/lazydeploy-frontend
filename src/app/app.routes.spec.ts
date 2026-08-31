import { routes } from './app.routes';

describe('application routes', () => {
  it('redirects the root route to the dashboard', () => {
    const rootRoute = routes.find((route) => route.path === '' && route.redirectTo);

    expect(rootRoute?.redirectTo).toBe('dashboard');
  });

  it('defines the initial public and workspace paths', () => {
    const routePaths = routes.map((route) => route.path);
    const workspaceRoute = routes.find((route) => route.component);

    expect(routePaths).toEqual(expect.arrayContaining(['login', 'register', '**']));
    expect(workspaceRoute?.children?.map((route) => route.path)).toEqual(
      expect.arrayContaining(['dashboard', 'alerts/new', 'alerts/:id', 'alerts/:id/edit', 'history']),
    );
  });
});
