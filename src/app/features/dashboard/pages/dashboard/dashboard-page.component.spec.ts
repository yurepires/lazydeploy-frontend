import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render the empty alerts state', async () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Meus alertas');
    expect(compiled.textContent).toContain('Nenhum alerta configurado');
  });
});
