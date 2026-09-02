import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServerSearchResult } from '../../models/server-search-result.model';
import { ServerSearchResultCardComponent } from './server-search-result-card.component';

describe('ServerSearchResultCardComponent', () => {
  let fixture: ComponentFixture<ServerSearchResultCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServerSearchResultCardComponent],
    }).compileComponents();
  });

  function createCard(result: ServerSearchResult = createResult()): void {
    fixture = TestBed.createComponent(ServerSearchResultCardComponent);
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();
  }

  it('should show the important server information', () => {
    createCard();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('LOST CONQUEST');
    expect(text).toContain('Operation Locker');
    expect(text).toContain('58/64 jogadores');
    expect(text).toContain('2 na fila');
    expect(text).toContain('Conquest Large');
  });

  it('should emit the selected server only after an explicit click', () => {
    createCard();
    let selected: ServerSearchResult | undefined;

    fixture.componentInstance.serverSelected.subscribe((result) => (selected = result));
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(selected).toEqual(createResult());
  });

  it('should display a selected state and disable selecting it again', () => {
    createCard();
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.server-result--selected')).toBeTruthy();
    expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(fixture.nativeElement.textContent).toContain('Servidor selecionado');
  });
});

function createResult(): ServerSearchResult {
  return {
    guid: 'guid-1',
    displayName: 'LOST CONQUEST',
    mapId: 'MP_Prison',
    mapDisplayName: 'Operation Locker',
    players: 58,
    maxPlayers: 64,
    queue: 2,
    gameMode: 'Conquest Large',
  };
}
