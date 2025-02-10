import { Component, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { WorkadventureService } from '../workadventure.service';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { RemotePlayerInterface } from '@workadventure/iframe-api-typings';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { jitsiDomain } from '../smartphone/jitsi-options';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { add } from 'date-fns';

import { InputMaskModule } from 'primeng/inputmask';
import { CallRequest, Contact } from '../smartphone/smartphone.component';
import { InputTextModule } from 'primeng/inputtext';
import { PlayerSelectorComponent } from '../player-selector/player-selector.component';

interface MapProperty {
  name: string;
  value: string;
  type: string;
}

interface MapObject {
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface SetVariableEvent {
  variableName: string;
  variableValue: unknown;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CardModule,
    ButtonModule,
    CommonModule,
    TableModule,
    InputNumberModule,
    InputTextModule,
    FormsModule,
    InputMaskModule,
    PlayerSelectorComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  selectedPlayersToPlaySound: Set<RemotePlayerInterface> =
    new Set<RemotePlayerInterface>();

  player?: WorkadventurePlayerCommands;
  players: RemotePlayerInterface[] = [];
  api: unknown;
  objectsWithOpenWebsiteProperty: MapProperty[] = [];
  objects: MapObject[] = [];
  countdownMinutes = 10;
  countdownSeconds = 0;
  worldTimeHours = 12;
  worldTimeMinutes = 0;
  timeAsString = '11-00';
  developerMode = false;
  calls: CallRequest[] = [];
  adminPhoneNumbers: Contact[] = [];
  displayNameForNewPhoneNumber = '';
  phoneNumberForNewPhoneNumber = '';
  playerDocuments: Record<number, string> = {};

  constructor(private workadventureService: WorkadventureService) {}

  async ngOnInit(): Promise<void> {
    document.querySelector('html')?.classList.toggle('dark-mode');

    await this.workadventureService.init();

    this.player = this.workadventureService.player!;
    this.workadventureService.playersSubject.subscribe((players) => {
      this.players = players;
      this.calls = this.getCalls(players);
    });

    this.objectsWithOpenWebsiteProperty = await this.getAllDocumentLinksInMap();
    console.log(this.objectsWithOpenWebsiteProperty);

    this.developerMode =
      (WA.player.state.loadVariable('developerMode') as boolean) || false;
    WA.player.state.onVariableChange('developerMode').subscribe((value) => {
      this.developerMode = value as boolean;
    });

    this.adminPhoneNumbers = this.player.state['phoneNumbers'] as Contact[];

    this.player.state.onVariableChange('phoneNumbers').subscribe((value) => {
      this.adminPhoneNumbers = value as Contact[];
    });

    const map = await WA.room.getTiledMap();
    this.objects = map.layers
      .filter((i) => i.type == 'objectgroup')
      .map((i) => i.objects)
      .flat()
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAllDocumentLinksInMap() {
    const map = await WA.room.getTiledMap();
    return map.layers
      .map(
        (l) =>
          (l as unknown as { objects: { properties?: MapProperty[] }[] })
            .objects || [],
      )
      .flat()
      .filter((i) => !!i.properties && i.properties.length > 0)
      .map((i) => i.properties?.find((i) => i.name == 'openWebsite'))
      .filter((i) => !!i);
  }

  getCalls(players: RemotePlayerInterface[]): CallRequest[] {
    return players
      .filter((i) => !!i.state['calling'])
      .map((i) => i.state['calling'] as CallRequest);
  }

  playSoundForSelectedPlayers(soundUrl: string): void {
    Array.from(this.selectedPlayersToPlaySound).forEach((p) =>
      p.sendEvent('playSound', soundUrl),
    );
  }

  joinCall(targetPlayer: RemotePlayerInterface): void {
    const roomName = targetPlayer.state['calling'] as string;
    window.open(`https://${jitsiDomain}/${roomName}`);
    //this.api = new (window as any).JitsiMeetExternalAPI(jitsiDomain, getJitsiConfig(roomName, 500, 500));
  }

  teleportToPlayer(targetPlayer: RemotePlayerInterface) {
    const position = targetPlayer.position;
    WA.player.teleport(position.x, position.y);
  }

  call(targetPlayer: RemotePlayerInterface) {
    const callRequest: CallRequest = {
      fromPhoneNumber: '+111111111',
      fromPlayerName: 'Admin',
      toPhoneNumber: targetPlayer.state['phoneNumber'] as string,
      toPlayerName: targetPlayer.name,
      roomName: 'admin_to_player_',
    };
    WorkadventureService.requestCall(targetPlayer, callRequest);
    window.open(`https://${jitsiDomain}/${callRequest.roomName}`);
  }

  isAdmin(player: RemotePlayerInterface) {
    return this.workadventureService.isUserAdmin(player.uuid);
  }

  teleportToObject(object: MapObject) {
    const middleX = object.x + (object.width ?? 0) / 2;
    const middleY = object.y + (object.height ?? 0) / 2;
    console.log(object, middleX, middleY);
    WA.player.teleport(middleX, middleY);
  }

  setCountdown() {
    const countdownDate = add(new Date(), {
      minutes: this.countdownMinutes,
      seconds: this.countdownSeconds,
    });
    this.workadventureService.setCountdownDate(countdownDate);
  }

  resetCountdown() {
    this.workadventureService.setCountdownDate(undefined);
  }

  setTime() {
    this.workadventureService.setVirtualWorldTime({
      date: new Date(),
      offsetInSeconds:
        this.worldTimeHours * 60 * 60 + this.worldTimeMinutes * 60,
    });
  }

  async toggleDeveloperMode() {
    await WA.player.state.saveVariable('developerMode', !this.developerMode);
  }

  startBroadcast() {
    console.log('Starting broadcast');
    const roomName = 'broadcast';
    WA.event.broadcast('joinBroadcast', roomName);
    window.open(`https://${jitsiDomain}/${roomName}`);
  }
  listenToCall(callRequest: CallRequest) {
    window.open(`https://${jitsiDomain}/${callRequest.roomName}`);
  }
  getPhoneNumbers(player: RemotePlayerInterface): string {
    return (player.state['phoneNumbers'] as Contact[])
      .map((i) => `${i.contactName || '(no alias)'}: ${i.phoneNumber}`)
      .join('\n');
  }

  deleteAdminNumber(contact: Contact) {
    let currentNumbers = this.player!.state['phoneNumbers'] as Contact[];
    currentNumbers = currentNumbers.filter(
      (i) =>
        i.contactName !== contact.contactName &&
        i.phoneNumber != contact.phoneNumber,
    );
    this.player!.state.saveVariable('phoneNumbers', currentNumbers, {
      public: true,
      persist: true,
      scope: 'world',
    });
  }

  addPhoneNumber() {
    const contact: Contact = {
      contactName: this.displayNameForNewPhoneNumber,
      phoneNumber: this.phoneNumberForNewPhoneNumber,
    };

    if (!contact.contactName || contact.contactName == '') return;
    if (!contact.phoneNumber || contact.phoneNumber == '') return;

    const currentNumbers = this.player!.state['phoneNumbers'] as Contact[];
    currentNumbers.push(contact);
    this.player!.state.saveVariable('phoneNumbers', currentNumbers, {
      public: true,
      persist: true,
      scope: 'world',
    });
  }

  openDocument(player: RemotePlayerInterface) {
    const documentLink = player.state['document'] as string;
    window.open(documentLink);
  }
  setPlayerDocument($event: Event, player: RemotePlayerInterface) {
    this.setVariableOnRemotePlayer(player, {
      variableName: 'document',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variableValue: ($event.target as any).value,
    } as SetVariableEvent);
  }

  setVariableOnRemotePlayer(
    player: RemotePlayerInterface,
    event: SetVariableEvent,
  ) {
    player.sendEvent('setVariable', event);
  }

  togglePhone(player: RemotePlayerInterface) {
    this.setVariableOnRemotePlayer(player, {
      variableName: 'phoneDisabled',
      variableValue: !player.state['phoneDisabled'],
    } as SetVariableEvent);
  }
}
