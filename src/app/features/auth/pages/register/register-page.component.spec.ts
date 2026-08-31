import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RegisterPageComponent } from './register-page.component';

describe('RegisterPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render the registration placeholder', async () => {
    const fixture = TestBed.createComponent(RegisterPageComponent);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Crie seu workspace',
    );
  });
});
