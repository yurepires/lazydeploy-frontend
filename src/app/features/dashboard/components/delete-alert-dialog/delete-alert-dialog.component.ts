import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';

export interface DeleteAlertDialogData {
  readonly serverName: string;
}

@Component({
  selector: 'app-delete-alert-dialog',
  standalone: true,
  imports: [MatButton, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle],
  template: `
    <h2 mat-dialog-title>Remover alerta?</h2>
    <mat-dialog-content>
      <p>
        Este alerta deixará de monitorar o servidor
        <strong>{{ data.serverName }}</strong> para a sua conta.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Cancelar</button>
      <button matButton="filled" type="button" [mat-dialog-close]="true">Remover</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: min(100%, 26rem);
      }

      p {
        margin: 0;
        color: var(--text-secondary);
        line-height: 1.6;
      }

      strong {
        color: var(--text-primary);
        font-weight: 650;
      }
    `,
  ],
})
export class DeleteAlertDialogComponent {
  readonly data = inject<DeleteAlertDialogData>(MAT_DIALOG_DATA);
}
