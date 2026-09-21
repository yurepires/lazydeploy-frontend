import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

type LegalDocument = 'privacy' | 'terms';

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [MatButton, MatIcon, RouterLink],
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.scss',
})
export class LegalPageComponent {
  private readonly activatedRoute = inject(ActivatedRoute);

  readonly documentType = this.readDocumentType();

  get isPrivacyPolicy(): boolean {
    return this.documentType === 'privacy';
  }

  get pageTitle(): string {
    return this.isPrivacyPolicy ? 'Política de privacidade' : 'Termos de uso';
  }

  private readDocumentType(): LegalDocument {
    const documentType = this.activatedRoute.snapshot.data['document'];
    if (documentType === 'terms') {
      return 'terms';
    }
    return 'privacy';
  }
}
