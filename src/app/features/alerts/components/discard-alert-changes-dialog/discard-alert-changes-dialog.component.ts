import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-discard-alert-changes-dialog',
  standalone: true,
  imports: [MatButton, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle],
  templateUrl: './discard-alert-changes-dialog.component.html',
  styleUrl: './discard-alert-changes-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscardAlertChangesDialogComponent {}
