import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CheckboxChangeEvent, CheckboxModule } from 'primeng/checkbox';
import { UserInfo } from '../background/background.component';

@Component({
  selector: 'app-player-selector',
  standalone: true,
  imports: [CommonModule, CheckboxModule],
  templateUrl: './player-selector.component.html',
  styleUrl: './player-selector.component.scss',
})
export class PlayerSelectorComponent {
  @Input() userInfos?: UserInfo[];
  @Output() selectedPlayers = new EventEmitter<Set<UserInfo>>();
  private _selectedPlayers: Set<UserInfo> = new Set<UserInfo>();

  onChange($event: CheckboxChangeEvent, player: UserInfo) {
    const isSelected = $event.checked?.length > 0;
    if (isSelected) {
      this._selectedPlayers.add(player);
    } else {
      this._selectedPlayers.delete(player);
    }
    this.selectedPlayers.emit(this._selectedPlayers);
  }
}
