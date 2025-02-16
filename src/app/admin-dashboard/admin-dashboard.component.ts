import { Component, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import {
  BroadcastEvents,
  PlayerStateVariables,
  WorkadventureService,
} from '../workadventure.service';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { RemotePlayerInterface } from '@workadventure/iframe-api-typings';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { add } from 'date-fns';
import { PopoverModule } from 'primeng/popover';

import { InputMaskModule } from 'primeng/inputmask';
import { CallRequest, Contact } from '../smartphone/smartphone.component';
import { InputTextModule } from 'primeng/inputtext';
import { PlayerSelectorComponent } from '../player-selector/player-selector.component';
import { UserInfo } from '../background/background.component';
import { SelectModule } from 'primeng/select';

interface MapObject {
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface SetVariableEvent {
  playerUUID: string;
  variableName: string;
  variableValue: unknown;
}

export interface TeleportEvent {
  playerUUID: string;
  x: number;
  y: number;
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
    PopoverModule,
    SelectModule,
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
  areas: MapObject[] = [];
  countdownMinutes = 10;
  countdownSeconds = 0;
  worldTimeHours = 12;
  worldTimeMinutes = 0;
  timeAsString = '11-00';
  calls: CallRequest[] = [];
  adminPhoneNumbers: Contact[] = [];
  displayNameForNewPhoneNumber = '';
  phoneNumberForNewPhoneNumber = '';
  playerDocuments: Record<number, string> = {};
  userInfos: UserInfo[] = [];
  selectedObject?: MapObject;
  WA = WA;
  JSON = JSON;

  constructor(private workadventureService: WorkadventureService) {}

  async ngOnInit(): Promise<void> {
    document.querySelector('html')?.classList.toggle('dark-mode');
    await this.workadventureService.init();
    this.player = this.workadventureService.player!;

    // userInfos and calls
    this.getUserInfosAndCalls();

    // adminPhoneNumbers
    this.adminPhoneNumbers = this.player.state['phoneNumbers'] as Contact[];
    this.player.state.onVariableChange('phoneNumbers').subscribe((value) => {
      this.adminPhoneNumbers = value as Contact[];
    });

    // areas
    const map = await WA.room.getTiledMap();
    this.areas = map.layers
      .filter((i) => i.type == 'objectgroup')
      .map((i) => i.objects)
      .flat()
      .filter((i) => i.type === 'area')
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getUserInfosAndCalls() {
    this.userInfos = await this.workadventureService.getPlayerInfos();
    this.calls = this.getCalls();
  }

  getCalls(): CallRequest[] {
    return distinctCalls(
      this.userInfos.filter((i) => !!i.currentCall).map((i) => i.currentCall),
    );
  }

  playSoundForSelectedPlayers(soundUrl: string): void {
    throw new Error('Not implemented');
    Array.from(this.selectedPlayersToPlaySound).forEach((p) =>
      // ToDo
      p.sendEvent(BroadcastEvents.PLAY_SOUND, soundUrl),
    );
  }

  joinCall(targetPlayer: CallRequest): void {
    window.open(
      `https://${WorkadventureService.getRoomConfig().jitsiDomain}/${targetPlayer.roomName}`,
    );
  }

  stopCall(callRequest: CallRequest) {
    WA.event.broadcast(BroadcastEvents.CALL_DECLINED, callRequest);
    setTimeout(() => {
      this.getUserInfosAndCalls();
    }, 500);
  }

  teleportToPlayer(targetPlayer: UserInfo) {
    const position = targetPlayer.position;
    WA.player.teleport(position.x, position.y);
  }

  call(targetPlayer: UserInfo) {
    const callRequest: CallRequest = {
      fromPhoneNumber: '+111111111',
      fromPlayerName: 'Admin',
      toPhoneNumber: targetPlayer.phoneNumbers[0].phoneNumber,
      toPlayerName: targetPlayer.playerName,
      roomName: 'admin_to_player_',
    };
    WorkadventureService.requestCall(callRequest);
    window.open(
      `https://${WorkadventureService.getRoomConfig().jitsiDomain}/${callRequest.roomName}`,
    );
  }

  isAdmin(player: RemotePlayerInterface) {
    return this.workadventureService.isUserAdmin(player.uuid);
  }

  getMiddleOfObject(object: MapObject) {
    const middleX = object.x + (object.width ?? 0) / 2;
    const middleY = object.y + (object.height ?? 0) / 2;
    return {
      x: middleX,
      y: middleY,
    };
  }

  teleportToObject(object: MapObject) {
    const position = this.getMiddleOfObject(object);
    WA.player.teleport(position.x, position.y);
  }

  teleportPlayerToArea(userInfo: UserInfo, object: MapObject) {
    const position = this.getMiddleOfObject(object);
    WA.event.broadcast(BroadcastEvents.TELEPORT, {
      playerUUID: userInfo.playerUUID,
      x: position.x,
      y: position.y,
    } as TeleportEvent);
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

  startBroadcast() {
    console.log('Starting broadcast');
    const roomName = 'broadcast';
    WA.event.broadcast(BroadcastEvents.JOIN_BROADCAST, roomName);
    window.open(
      `https://${WorkadventureService.getRoomConfig().jitsiDomain}/${roomName}`,
    );
  }

  listenToCall(callRequest: CallRequest) {
    window.open(
      `https://${WorkadventureService.getRoomConfig().jitsiDomain}/${callRequest.roomName}`,
    );
  }

  getPhoneNumbers(player: UserInfo): string {
    return player.phoneNumbers
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

    const currentNumbers = this.player!.state[
      PlayerStateVariables.PHONE_NUMBERS
    ] as Contact[];
    currentNumbers.push(contact);
    this.player!.state.saveVariable(
      PlayerStateVariables.PHONE_NUMBERS,
      currentNumbers,
      {
        public: true,
        persist: true,
        scope: 'world',
      },
    );
  }

  openDocument(userInfo: UserInfo) {
    window.open(userInfo.documentLink);
  }

  setPlayerDocument($event: Event, player: UserInfo) {
    this.setVariableOnRemotePlayer({
      playerUUID: player.playerUUID,
      variableName: PlayerStateVariables.DOCUMENT_LINK,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variableValue: ($event.target as any).value,
    } as SetVariableEvent);
  }

  setVariableOnRemotePlayer(event: SetVariableEvent) {
    WA.event.broadcast(BroadcastEvents.SET_VARIABLE, event);
    this.getUserInfosAndCalls();
  }

  togglePhone(userInfo: UserInfo) {
    this.setVariableOnRemotePlayer({
      playerUUID: userInfo.playerUUID,
      variableName: PlayerStateVariables.PHONE_DISABLED,
      variableValue: !userInfo.phoneDisabled,
    } as SetVariableEvent);
  }
  getConfigAsJsonString() {
    return JSON.stringify(WorkadventureService.getRoomConfig(), null, '\t');
  }
}

function distinctCalls(elements: CallRequest[]): CallRequest[] {
  return Object.values(
    elements.reduce(
      (previous, current) => {
        if (!(current.roomName in previous)) {
          previous[current.roomName] = current;
        }
        return previous;
      },
      {} as Record<string, CallRequest>,
    ),
  );
}
