import { BreakpointObserver } from '@angular/cdk/layout';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatToolbar } from '@angular/material/toolbar';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { BrandMarkComponent } from '../../shared/components/brand-mark/brand-mark.component';
import { AuthService } from '../auth/auth.service';

const SIDENAV_OVERLAY_BREAKPOINT = '(max-width: 905px)';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    BrandMarkComponent,
    MatIcon,
    MatIconButton,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    MatToolbar,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  readonly authService = inject(AuthService);
  private readonly viewport = toSignal(this.breakpointObserver.observe(SIDENAV_OVERLAY_BREAKPOINT), {
    initialValue: { matches: false, breakpoints: {} },
  });

  readonly isMobile = computed(() => this.viewport().matches);
  readonly sidenavMode = computed<'side' | 'over'>(() => (this.isMobile() ? 'over' : 'side'));
  readonly sidenavOpened = signal(false);

  toggleNavigation(): void {
    this.sidenavOpened.update((opened) => !opened);
  }

  closeNavigationOnMobile(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      error: () => {
        // AuthService clears the local session and redirects even if the API is unavailable.
      },
    });
  }
}
