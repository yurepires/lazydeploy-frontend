import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { BrandMarkComponent } from '../../../../shared/components/brand-mark/brand-mark.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [BrandMarkComponent, MatButton, MatIcon, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {}
