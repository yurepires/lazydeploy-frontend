import { Component } from '@angular/core';

import { PagePlaceholderComponent } from '../../../../shared/components/page-placeholder/page-placeholder.component';

@Component({
  selector: 'app-create-alert-page',
  standalone: true,
  imports: [PagePlaceholderComponent],
  template: `
    <app-page-placeholder
      eyebrow="Novo alerta"
      title="Crie seu próximo alerta"
      description="O assistente de configuração permitirá escolher um servidor, mapas favoritos e a quantidade mínima de jogadores."
      icon="add_alert"
      actionLabel="Voltar ao dashboard"
      actionRoute="/dashboard"
    />
  `,
})
export class CreateAlertPageComponent {}
