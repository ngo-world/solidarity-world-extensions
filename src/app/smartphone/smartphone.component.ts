import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  RemotePlayerInterface,
  Sound,
} from '@workadventure/iframe-api-typings';
import { getJitsiConfig, getRoomName, jitsiDomain } from './jitsi-options';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { WorkadventureService } from '../workadventure.service';

export interface Contact {
  contactName: string;
  phoneNumber: string;
}

export interface CallRequest {
  fromPhoneNumber: string;
  fromPlayerName: string;
  toPhoneNumber: string;
  toPlayerName: string;
  roomName: string;
}

@Component({
  selector: 'app-smartphone',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, FormsModule],
  templateUrl: './smartphone.component.html',
  styleUrl: './smartphone.component.scss',
})
export class SmartphoneComponent implements OnInit {
  ringingSound: Sound = WA.sound.loadSound(
    `https://${jitsiDomain}/sounds/outgoingRinging.mp3`,
  );
  player?: WorkadventurePlayerCommands;
  players: RemotePlayerInterface[] = [];
  /**
   * See https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe
   *
   * ToDo: find TypeScript typings
   *
   * The type is JitsiMeetExternalAPI
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any;
  showSmartphone = false;
  callingTargetPlayer?: RemotePlayerInterface;
  callRequest?: CallRequest;
  phoneNumberToAdd = '';
  contactToAdd = '';
  contacts: Contact[] = [];
  currentUserPhoneNumber = '';
  phoneEnabled = false;

  constructor(private workadventureService: WorkadventureService) {}

  getContacts(): Contact[] {
    return (WA.player.state['contacts'] as Contact[]) || [];
  }

  async ngOnInit(): Promise<void> {
    await this.workadventureService.init();
    console.info('Initializing smartphone screen');
    this.player = this.workadventureService.player!;
    this.currentUserPhoneNumber = (
      this.player.state.loadVariable('phoneNumbers') as Contact[]
    )[0].phoneNumber;
    this.showSmartphone = WA.player.state['smartphoneShown'] as boolean;
    this.contacts = this.getContacts();

    this.workadventureService.playersSubject.subscribe((players) => {
      this.players = players;
      this.contacts = this.getContacts();
    });

    this.phoneEnabled = !this.player?.state['phoneDisabled'] as boolean;
    this.player.state.onVariableChange('phoneDisabled').subscribe(() => {
      this.phoneEnabled = !this.player?.state['phoneDisabled'] as boolean;
    });

    this.workadventureService.eventsSubject.subscribe((event) => {
      switch (event.name) {
        case 'requestedCall':
          if (!this.phoneEnabled) {
            console.error('Got call but phone is disabled');
            return;
          }
          console.log('User requests call', event);
          this.onCallRequested(event.data as CallRequest, event.senderId!);
          this.showSmartphone = true;
          WA.player.state['smartphoneShown'] = true;
          break;
        case 'declinedCall':
          console.log('User declined call');
          this.stopCall();
          break;
        default:
          console.error('Received unknown event. Ignoring', event);
          break;
      }
    });

    WA.player.state.onVariableChange('smartphoneShown').subscribe(() => {
      console.info('Toggling phone');
      this.showSmartphone = WA.player.state['smartphoneShown'] as boolean;
    });
  }

  async onCallRequested(callRequest: CallRequest, requestedUserId: number) {
    console.info('Call requested', callRequest.roomName, requestedUserId);
    this.ringingSound.play({ loop: true });
    const user = Array.from(WA.players.list()).find(
      (x) => x.playerId == requestedUserId,
    )!;
    console.log('Requesting user', user);
    this.callingTargetPlayer = user;
    this.callRequest = callRequest;
  }

  async joinCall(callRequest: CallRequest, playRingingSound: boolean) {
    console.info('Joining call', callRequest, playRingingSound);

    await this.player!.state.saveVariable('calling', callRequest, {
      public: true,
      persist: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.api = new (window as any).JitsiMeetExternalAPI(
      jitsiDomain,
      getJitsiConfig(callRequest.roomName, false, 0, 0),
    );

    if (playRingingSound) {
      this.ringingSound.play({ loop: true });
    }
    this.api.addListener('participantJoined', () => {
      this.ringingSound.stop();
    });
    this.api.addListener('participantLeft', () => {
      // WA.sound.loadSound(`https://${jitsiDomain}/sounds/left.mp3`).play(undefined);
      this.stopCall();
    });
  }

  requestCall(contact: Contact) {
    console.log(this.players.map((i) => i.state['phoneNumbers']));
    const player = this.players.find(
      (x) =>
        !!((x.state['phoneNumbers'] as Contact[]) || []).find(
          (i) => i.phoneNumber == contact.phoneNumber,
        ),
    );
    if (!player) {
      console.error(
        'Cannot call user with invalid phone number:',
        contact,
        this.players,
      );
      return;
    }
    this.callingTargetPlayer = player;

    const callRequest: CallRequest = {
      fromPlayerName: WA.player.name,
      fromPhoneNumber: this.currentUserPhoneNumber,
      toPlayerName: player.name,
      toPhoneNumber: contact.phoneNumber,
      roomName: getRoomName(WA.player.playerId, player.playerId),
    };
    this.callRequest = callRequest;
    this.joinCall(callRequest, true);
    WorkadventureService.requestCall(player, callRequest);
  }

  async stopCall() {
    console.log('Stopping call');

    await this.player!.state.saveVariable('calling', null, {
      public: true,
      persist: false,
    });

    this.callingTargetPlayer?.sendEvent('declinedCall', '');
    this.callingTargetPlayer = undefined;

    this.callRequest = undefined;

    this.ringingSound.stop();
    this.api?.dispose();
    this.api = null;
  }

  acceptCall() {
    console.info('Accepting call');
    this.joinCall(this.callRequest!, false);
  }

  // ToDo: this is only needed when hot reloading
  async reload() {
    const currentPopup = (await WA.ui.website.getAll()).find((x) =>
      x.url.endsWith('/smartphone'),
    );
    currentPopup?.close();
  }

  async addContact(contactName: string, phoneNumber: string) {
    this.contacts.push({
      contactName,
      phoneNumber: phoneNumber.trim(),
    });
    this.saveContacts();
    // ToDo
    this.contactToAdd = '';
    this.phoneNumberToAdd = '';
  }

  removeContact(contact: Contact) {
    const index = this.contacts.indexOf(contact);
    if (index > -1) {
      this.contacts.splice(index, 1);
    } else {
      console.error('Could not find contact', contact, this.contacts);
    }
    this.saveContacts();
  }

  private saveContacts() {
    WA.player.state['contacts'] = this.contacts;
  }
}
