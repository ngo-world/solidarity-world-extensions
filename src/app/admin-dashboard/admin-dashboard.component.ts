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
  /*
  playersTest: RemotePlayerInterface[] = [{
      name: "yeah",
      outlineColor: 1,
      playerId: 0,
    } as RemotePlayerInterface,{
      name: "yeah2",
      outlineColor: 1,
      playerId: 1,
    } as RemotePlayerInterface];
     */

  constructor(private workadventureService: WorkadventureService) {}

  async ngOnInit(): Promise<void> {
    const element = document.querySelector('html');
    element?.classList.toggle('dark-mode');

    console.log('ngOnInit');
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
    return JSON.stringify(player.state['phoneNumbers'] as Contact[]);
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

  openGoogleDrive() {
    //
  }
}
