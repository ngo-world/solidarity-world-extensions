import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RemotePlayerInterface } from '@workadventure/iframe-api-typings';
import { getJitsiConfig, jitsiDomain } from './jitsi-options';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';

@Component({
    selector: 'app-smartphone',
    standalone: true,
    imports: [
        CommonModule
    ],
    templateUrl: './smartphone.component.html',
    styleUrl: './smartphone.component.scss'
})
export class SmartphoneComponent implements OnInit {
    player?: WorkadventurePlayerCommands;
    players: RemotePlayerInterface[] = Array();
    api: any;

    ngOnInit(): void {
        WA.onInit().then(async () => {
            console.log('Scripting API ready inside iFrame');
            this.player = WA.player;
            await WA.players.configureTracking();

            setInterval(async () => {
                this.players = Array.from(WA.players.list());
            }, 1000);

            WA.event.on("requestedCall").subscribe((event) => {
                console.log("Event received", event.data);
                this.onCallRequested(event.data as String);
            });

        }).catch(e => console.error(e));
    }
    onCallRequested(roomName: String) {
        this.joinCall(roomName);
    }

    joinCall(roomName: String) {
        const options = getJitsiConfig(roomName);
        console.log(`Joining call in with roomname: ${options.roomName}`);
        this.api = new (window as any).JitsiMeetExternalAPI(jitsiDomain, options);
        this.api.addListener('participantLeft', () => {
            this.stopCall();
        });
    }

    requestCall(player: RemotePlayerInterface) {
        const roomName =`${WA.player.playerId}_to_${player.playerId}`;
        this.joinCall(roomName);
        player.sendEvent("requestedCall", roomName);
    }

    stopCall() {
        this.api.dispose();
        this.api = null;
    }
}
