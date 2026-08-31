import { Component } from '@angular/core';

import { PagePlaceholderComponent } from '../../../../shared/components/page-placeholder/page-placeholder.component';

@Component({
  selector: 'app-edit-alert-page',
  standalone: true,
  imports: [PagePlaceholderComponent],
  template: `
    <app-page-placeholder
      eyebrow="Editar alerta"
      title="Ajuste suas preferências"
      description="Em breve você poderá atualizar mapas, limite de jogadores e canais de notificação sem perder seu histórico."
      icon="tune"
      actionLabel="Ver meus alertas"
      actionRoute="/dashboard"
    />
  `,
})
export class EditAlertPageComponent {}
