import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RemotePlayerInterface } from '@workadventure/iframe-api-typings';
import { CheckboxChangeEvent, CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-player-selector',
  standalone: true,
  imports: [CommonModule, CheckboxModule],
  templateUrl: './player-selector.component.html',
  styleUrl: './player-selector.component.scss'
})
export class PlayerSelectorComponent {
  @Input() players?: RemotePlayerInterface[];
  @Output() selectedPlayers = new EventEmitter<Set<RemotePlayerInterface>>();
  private _selectedPlayers: Set<RemotePlayerInterface> = new Set<RemotePlayerInterface>();


  onChange($event: CheckboxChangeEvent, player: RemotePlayerInterface) {
    const isSelected = $event.checked?.length > 0;
    if (isSelected) {
      this._selectedPlayers.add(player);
    } else {
      this._selectedPlayers.delete(player);
    }
    this.selectedPlayers.emit(this._selectedPlayers);
  }
}
