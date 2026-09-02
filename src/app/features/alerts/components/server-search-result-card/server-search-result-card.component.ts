import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { ServerSearchResult } from '../../models/server-search-result.model';

@Component({
  selector: 'app-server-search-result-card',
  standalone: true,
  imports: [MatButton, MatIcon],
  templateUrl: './server-search-result-card.component.html',
  styleUrl: './server-search-result-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerSearchResultCardComponent {
  readonly result = input.required<ServerSearchResult>();
  readonly selected = input(false);

  readonly serverSelected = output<ServerSearchResult>();

  readonly mapLabel = computed(() => {
    const server = this.result();

    if (server.mapDisplayName) {
      return server.mapDisplayName;
    }

    if (server.mapId) {
      return server.mapId;
    }

    return 'Mapa não informado';
  });

  readonly playersLabel = computed(() => {
    const server = this.result();

    if (server.players === undefined) {
      return 'Jogadores indisponíveis';
    }

    if (server.maxPlayers === undefined) {
      return `${server.players} jogadores`;
    }

    return `${server.players}/${server.maxPlayers} jogadores`;
  });

  readonly queueLabel = computed(() => {
    const queue = this.result().queue;

    if (queue === undefined) {
      return null;
    }

    return `${queue} na fila`;
  });

  readonly gameModeLabel = computed(() => this.result().gameMode ?? 'Modo não informado');

  readonly selectionLabel = computed(() => {
    if (this.selected()) {
      return 'Servidor selecionado';
    }

    return 'Selecionar servidor';
  });

  selectServer(): void {
    if (this.selected()) {
      return;
    }

    this.serverSelected.emit(this.result());
  }
}
