import { Component, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-placeholder',
  standalone: true,
  imports: [MatButton, MatIcon, RouterLink],
  templateUrl: './page-placeholder.component.html',
  styleUrl: './page-placeholder.component.scss',
})
export class PagePlaceholderComponent {
  readonly eyebrow = input('Em breve');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input('construction');
  readonly actionLabel = input<string | null>(null);
  readonly actionRoute = input<string | null>(null);
}
