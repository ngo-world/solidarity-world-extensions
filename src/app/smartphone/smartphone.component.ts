import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Sound } from '@workadventure/iframe-api-typings';
import { getRoomName } from './jitsi-options';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import {
  BroadcastEvents,
  PlayerStateVariables,
  WorkadventureService,
} from '../workadventure.service';
import { LivekitClientService } from '../livekit-client.service';
import { Room } from 'livekit-client';

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
    `https://${WorkadventureService.getRoomConfig().jitsiDomain}/sounds/outgoingRinging.mp3`,
  );
  player?: WorkadventurePlayerCommands;
  showSmartphone = false;
  callRequest?: CallRequest;
  phoneNumberToAdd = '';
  contactToAdd = '';
  contacts: Contact[] = [];
  currentUserPhoneNumbers: Contact[] = [];
  phoneEnabled = false;
  room?: Room;

  constructor(private workadventureService: WorkadventureService) {}

  getContacts(): Contact[] {
    return (WA.player.state['contacts'] as Contact[]) || [];
  }

  async ngOnInit(): Promise<void> {
    console.info('Initializing smartphone screen');
    await this.workadventureService.init();
    this.player = this.workadventureService.player!;

    await this.player!.state.saveVariable(PlayerStateVariables.CALLING, null);
    this.currentUserPhoneNumbers = this.player.state.loadVariable(
      PlayerStateVariables.PHONE_NUMBERS,
    ) as Contact[];

    // contacts
    this.contacts = this.getContacts();

    // phoneDisabled
    this.phoneEnabled = !this.player?.state[
      PlayerStateVariables.PHONE_DISABLED
    ] as boolean;
    this.player.state
      .onVariableChange(PlayerStateVariables.PHONE_DISABLED)
      .subscribe(() => {
        const isEnabled = !this.player?.state[
          PlayerStateVariables.PHONE_DISABLED
        ] as boolean;
        if (isEnabled != this.phoneEnabled) {
          this.showSmartphone = true;
        }
        this.phoneEnabled = isEnabled;
      });

    // smartphoneShown
    this.showSmartphone = WA.player.state[
      PlayerStateVariables.SMARTPHONE_SHOWN
    ] as boolean;
    WA.player.state
      .onVariableChange(PlayerStateVariables.SMARTPHONE_SHOWN)
      .subscribe(() => {
        console.info('Toggling phone');
        this.showSmartphone = WA.player.state[
          PlayerStateVariables.SMARTPHONE_SHOWN
        ] as boolean;
      });

    this.workadventureService.eventsSubject.subscribe((event) => {
      switch (event.name) {
        case BroadcastEvents.REQUEST_CALL:
          this.onEventRequestedCall(event.data as CallRequest);
          break;
        case BroadcastEvents.CALL_DECLINED:
          this.onEventCallDeclined(event.data as CallRequest);
          break;
        default:
          break;
      }
    });
  }

  onEventCallDeclined(callRequest?: CallRequest) {
    if (!callRequest) {
      console.error('Received CALL_DECLINED without CallRequest. Ignoring');
      return;
    }

    if (
      !this.currentUserPhoneNumbers.find(
        (c) => c.phoneNumber == callRequest.toPhoneNumber,
      ) &&
      !this.currentUserPhoneNumbers.find(
        (c) => c.phoneNumber == callRequest.fromPhoneNumber,
      )
    ) {
      console.warn('Ignoring call request because the number does not match');
      return;
    }

    if (!this.callRequest) {
      console.warn(
        'Ignoring call request because there is no local call request',
        callRequest,
      );
      return;
    }

    console.log(`User declined call`);
    this.stopCall('Other user declined call');
  }

  onEventRequestedCall(callRequest: CallRequest) {
    if (
      !this.currentUserPhoneNumbers.find(
        (c) => c.phoneNumber == callRequest.toPhoneNumber,
      )
    ) {
      console.warn('Ignoring call request because the number does not match');
      return;
    }

    console.log('User requests call', callRequest);
    this.onCallRequested(callRequest);
    this.showSmartphone = true;
    WA.player.state[PlayerStateVariables.SMARTPHONE_SHOWN] = true;
  }

  async onCallRequested(callRequest: CallRequest) {
    console.info('Call requested', callRequest.roomName);
    this.callRequest = callRequest;

    if (this.phoneEnabled) {
      this.ringingSound.play({ loop: true });
    } else {
      this.stopCall('Phone is disabled');
      console.warn('Stopping call because phone is disabled');
    }
  }

  async joinCall(callRequest: CallRequest, playRingingSound: boolean) {
    console.info('Joining call', callRequest, playRingingSound);
    this.callRequest = callRequest;

    await this.player!.state.saveVariable(
      PlayerStateVariables.CALLING,
      callRequest,
    );

    this.room = await LivekitClientService.joinRoom(
      callRequest.roomName,
      WA.player.name,
      () => {
        this.ringingSound.stop();
      },
      () => {
        this.ringingSound.stop();
        WA.sound
          .loadSound(`${location.origin}/phone-call-disconnect.mp3`)
          .play(undefined);
        this.stopCall('Call is over');
      },
    );

    if (playRingingSound) {
      this.ringingSound.play({ loop: true });
    }
  }

  requestCall(contact: Contact) {
    const contactToCallFrom = this.currentUserPhoneNumbers[0];
    const callRequest: CallRequest = {
      fromPlayerName: contactToCallFrom.contactName || WA.player.name,
      fromPhoneNumber: contactToCallFrom.phoneNumber,
      toPlayerName: contact.contactName,
      toPhoneNumber: contact.phoneNumber,
      roomName: getRoomName(contactToCallFrom.phoneNumber, contact.phoneNumber),
    };
    this.callRequest = callRequest;
    this.joinCall(callRequest, true);
    WorkadventureService.requestCall(callRequest);
  }

  async stopCall(reason: string) {
    console.log(`Stopping call because of: ${reason}`);
    await this.player!.state.saveVariable(PlayerStateVariables.CALLING, null);
    this.ringingSound.stop();
    this.room?.disconnect();
    this.room = undefined;

    WA.event.broadcast(BroadcastEvents.CALL_DECLINED, this.callRequest);
    this.callRequest = undefined;
  }

  acceptCall() {
    console.info('Accepting call');
    this.joinCall(this.callRequest!, false);
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

  async removeContact(contact: Contact) {
    const index = this.contacts.indexOf(contact);
    if (index > -1) {
      this.contacts.splice(index, 1);
    } else {
      console.error('Could not find contact', contact, this.contacts);
    }
    await this.saveContacts();
  }

  private async saveContacts() {
    await WA.player.state.saveVariable('contacts', this.contacts);
  }
}
