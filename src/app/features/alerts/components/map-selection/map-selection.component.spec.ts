import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BattlefieldMap } from '../../models/battlefield-map.model';
import { MapSelectionComponent } from './map-selection.component';

describe('MapSelectionComponent', () => {
  let fixture: ComponentFixture<MapSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapSelectionComponent],
    }).compileComponents();
  });

  function createSelection(): void {
    fixture = TestBed.createComponent(MapSelectionComponent);
    fixture.componentRef.setInput('maps', maps());
    fixture.componentRef.setInput('selectedIds', ['MP_Prison']);
    fixture.detectChanges();
  }

  it('should render friendly map names and the selected count', () => {
    createSelection();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Operation Locker');
    expect(text).toContain('Pearl Market');
    expect(text).toContain('1 selecionado');
    expect(text).not.toContain('MP_Prison');
  });

  it('should emit technical ids for multiple selections', () => {
    createSelection();
    let selectedIds: string[] | undefined;

    fixture.componentInstance.selectionChanged.subscribe((ids) => (selectedIds = ids));
    fixture.componentInstance.toggleMap(maps()[1], true);

    expect(selectedIds).toEqual(['MP_Prison', 'XP3_MarketPl']);
  });

  it('should not allow a disabled map to be selected', () => {
    createSelection();
    let emitted = false;

    fixture.componentInstance.selectionChanged.subscribe(() => (emitted = true));
    fixture.componentInstance.toggleMap(maps()[2], true);

    expect(emitted).toBe(false);
  });
});

function maps(): BattlefieldMap[] {
  return [
    { id: 'MP_Prison', displayName: 'Operation Locker', enabled: true, expansion: null },
    { id: 'XP3_MarketPl', displayName: 'Pearl Market', enabled: true, expansion: 'Final Stand' },
    { id: 'MP_Disabled', displayName: 'Disabled map', enabled: false, expansion: null },
  ];
}
