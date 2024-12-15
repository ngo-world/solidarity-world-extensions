import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RemotePlayerInterface, Sound } from '@workadventure/iframe-api-typings';
import { getJitsiConfig, jitsiDomain } from './jitsi-options';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';

interface Contact {
    contactName: String,
    phoneNumber: String
}

@Component({
    selector: 'app-smartphone',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        InputTextModule,
        FormsModule
    ],
    templateUrl: './smartphone.component.html',
    styleUrl: './smartphone.component.scss'
})
export class SmartphoneComponent implements OnInit {
    ringingSound: Sound = WA.sound.loadSound("https://jitsi.solidarity-world.de/sounds/outgoingRinging.mp3");
    player?: WorkadventurePlayerCommands;
    players: RemotePlayerInterface[] = Array();
    /**
     * See https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe
     * 
     * ToDo: find TypeScript typings
     * 
     * The type is JitsiMeetExternalAPI
     */
    api: any;
    hidden: boolean = true;
    callingTargetPlayer?: RemotePlayerInterface;
    roomNameToJoin?: String;
    phoneNumberToAdd: String = "";
    contactToAdd: String = "";
    contacts: Contact[] = [];

    async ngOnInit(): Promise<void> {
        WA.onInit().then(async () => {
            this.contacts = WA.player.state['contacts'] as Contact[] || [];
            this.hidden = !(WA.player.state['smartphoneShown'] as boolean);
            console.log('Scripting API ready inside iFrame');
            this.player = WA.player;
            await WA.players.configureTracking();

            setInterval(async () => {
                this.players = Array.from(WA.players.list()).flatMap(i => [i, i, i, i, i, i, i, i]);
            }, 1000);

            WA.event.on("requestedCall").subscribe((event) => {
                console.log("Event received", event.name);
                this.onCallRequested(event.data as String, event.senderId!);
                this.hidden = false;
                WA.player.state['smartphoneShown'] = true;
            });

            WA.event.on("declinedCall").subscribe((event) => {
                console.log("Event received", event.name);
                this.stopCall();
            });

            WA.player.state.onVariableChange('smartphoneShown').subscribe((_) => {
                this.hidden = !(WA.player.state['smartphoneShown'] as boolean);
            });
        }).catch(e => console.error(e));
    }

    async onCallRequested(roomName: String, requestedUserId: number) {
        this.ringingSound.play({ loop: true });
        const user = Array.from(WA.players.list()).find((x) => x.playerId == requestedUserId)!;
        console.log("Requesting user", user);
        this.callingTargetPlayer = user;
        this.roomNameToJoin = roomName;
        // ToDo: show "Accept or decline call" button
        //this.joinCall(roomName);
    }

    async joinCall(roomName: String, playRingingSound: boolean) {
        this.roomNameToJoin = undefined;
        console.log(`Joining call in with roomname: ${roomName}`);
        this.api = new (window as any).JitsiMeetExternalAPI(jitsiDomain, getJitsiConfig(roomName));

        if (playRingingSound) {
            this.ringingSound.play({ loop: true });
        }
        this.api.addListener('participantJoined', () => {
            this.ringingSound.stop();
        });
        this.api.addListener('participantLeft', () => {
            // WA.sound.loadSound("https://jitsi.solidarity-world.de/sounds/left.mp3").play(undefined);
            this.stopCall();
        });
    }

    requestCall(contact: Contact) {
        const player = (this.players.find(x => x.state['phoneNumber'] == contact.phoneNumber));
        if (!player) {
            console.error("Cannot call user with invalid phone number:", contact, this.players);
            return;
        }
        this.callingTargetPlayer = player;

        const roomName = `${WA.player.playerId}_to_${player.playerId}`;
        this.joinCall(roomName, true);
        player.sendEvent("requestedCall", roomName);
    }

    stopCall() {
        this.roomNameToJoin = undefined;
        this.ringingSound.stop();
        this.callingTargetPlayer = undefined;
        this.api?.dispose();
        this.api = null;
    }

    declineCall() {
        this.callingTargetPlayer!.sendEvent('declinedCall', '');
        this.stopCall();
    }

    acceptCall() {
        this.joinCall(this.roomNameToJoin!, false);
    }

    // ToDo: this is only needed when hot reloading
    async reload() {
        const currentPopup = (await WA.ui.website.getAll()).find(x => x.url.endsWith('/smartphone'));
        currentPopup?.close();
    }

    async addContact(contactName: String, phoneNumber: String) {
        this.contacts.push({
            contactName,
            phoneNumber: phoneNumber.trim()
        });
        this.saveContacts();
        // ToDo
        this.contactToAdd = '';
        this.phoneNumberToAdd = ''
    }

    removeContact(contact: Contact) {
        const index = this.contacts.indexOf(contact);
        if (index > -1) {
            this.contacts.splice(index, 1);
        } else {
            console.error("Could not find contact", contact, this.contacts);
        }
        this.saveContacts();
    }

    private saveContacts() {
        WA.player.state['contacts'] = this.contacts;
    }
}
