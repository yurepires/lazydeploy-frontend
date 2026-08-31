import { Component } from '@angular/core';

import { PagePlaceholderComponent } from '../../../../shared/components/page-placeholder/page-placeholder.component';

@Component({
  selector: 'app-alert-details-page',
  standalone: true,
  imports: [PagePlaceholderComponent],
  template: `
    <app-page-placeholder
      eyebrow="Detalhes do alerta"
      title="Acompanhe este alerta"
      description="Aqui você verá o estado atual do servidor, as regras configuradas e os eventos detectados."
      icon="monitoring"
      actionLabel="Criar um alerta"
      actionRoute="/alerts/new"
    />
  `,
})
export class AlertDetailsPageComponent {}
