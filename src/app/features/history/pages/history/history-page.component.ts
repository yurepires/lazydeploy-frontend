import { Component } from '@angular/core';

import { PagePlaceholderComponent } from '../../../../shared/components/page-placeholder/page-placeholder.component';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [PagePlaceholderComponent],
  template: `
    <app-page-placeholder
      eyebrow="Histórico"
      title="Seus eventos em um só lugar"
      description="As mudanças de mapa e as notificações aprovadas ficarão disponíveis aqui para consulta."
      icon="history"
      actionLabel="Voltar ao dashboard"
      actionRoute="/dashboard"
    />
  `,
})
export class HistoryPageComponent {}
