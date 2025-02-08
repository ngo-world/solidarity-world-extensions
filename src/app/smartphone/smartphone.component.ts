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

interface Contact {
  contactName: string;
  phoneNumber: string;
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
  roomNameToJoin?: string;
  phoneNumberToAdd = '';
  contactToAdd = '';
  contacts: Contact[] = [];

  constructor(private workadventureService: WorkadventureService) {}

  getContacts(): Contact[] {
    const contacts = (WA.player.state['contacts'] as Contact[]) || [];
    if (this.workadventureService.isCurrentUserAdmin()) {
      const playerContacts = this.players.map((i) => {
        return {
          contactName: i.name,
          phoneNumber: (i.state['phoneNumber'] as string) || '',
        } as Contact;
      });
      playerContacts.push(...contacts);
      return playerContacts;
    } else {
      return contacts;
    }
  }

  async ngOnInit(): Promise<void> {
    await this.workadventureService.init();
    console.info('Initializing smartphone screen');
    this.player = this.workadventureService.player!;
    this.showSmartphone = WA.player.state['smartphoneShown'] as boolean;
    this.contacts = this.getContacts();

    this.workadventureService.playersSubject.subscribe((players) => {
      this.players = players;
      this.contacts = this.getContacts();
    });
    this.workadventureService.eventsSubject.subscribe((event) => {
      switch (event.name) {
        case 'requestedCall':
          console.log('User requests call', event);
          this.onCallRequested(event.data as string, event.senderId!);
          this.showSmartphone = true;
          WA.player.state['smartphoneShown'] = true;
          break;
        case 'declinedCall':
          console.log('User declined call');
          this.stopCall();
          break;
        default:
          console.info('Received unknown event. Ignoring', event);
          break;
      }
    });

    WA.player.state.onVariableChange('smartphoneShown').subscribe(() => {
      console.info('Toggling phone');
      this.showSmartphone = WA.player.state['smartphoneShown'] as boolean;
    });
  }

  async onCallRequested(roomName: string, requestedUserId: number) {
    console.info('Call requested', roomName, requestedUserId);
    this.ringingSound.play({ loop: true });
    const user = Array.from(WA.players.list()).find(
      (x) => x.playerId == requestedUserId,
    )!;
    console.log('Requesting user', user);
    this.callingTargetPlayer = user;
    this.roomNameToJoin = roomName;
  }

  async joinCall(roomName: string, playRingingSound: boolean) {
    console.info('Joining call', roomName, playRingingSound);
    this.roomNameToJoin = undefined;
    console.log(`Joining call in with roomname: ${roomName}`);

    await this.player!.state.saveVariable(`calling`, roomName, {
      public: true,
      persist: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.api = new (window as any).JitsiMeetExternalAPI(
      jitsiDomain,
      getJitsiConfig(roomName, false, 1, 1),
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
    const player = this.players.find(
      (x) => x.state['phoneNumber'] == contact.phoneNumber,
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

    const roomName = getRoomName(WA.player.playerId, player.playerId);
    this.joinCall(roomName, true);
    player.sendEvent('requestedCall', roomName);
  }

  async stopCall() {
    console.log('Stopping call');

    await this.player!.state.saveVariable(`calling`, null, {
      public: true,
      persist: false,
    });

    this.callingTargetPlayer?.sendEvent('declinedCall', '');
    this.callingTargetPlayer = undefined;

    this.roomNameToJoin = undefined;

    this.ringingSound.stop();
    this.api?.dispose();
    this.api = null;
  }

  acceptCall() {
    console.info('Accepting call');
    this.joinCall(this.roomNameToJoin!, false);
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
