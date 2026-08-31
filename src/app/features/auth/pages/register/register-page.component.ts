import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { BrandMarkComponent } from '../../../../shared/components/brand-mark/brand-mark.component';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [BrandMarkComponent, MatButton, MatIcon, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
})
export class RegisterPageComponent {}
