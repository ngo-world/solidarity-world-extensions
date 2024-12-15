import { Injectable } from '@angular/core';
import { RemotePlayerInterface } from '@workadventure/iframe-api-typings';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';

@Injectable({
  providedIn: 'root'
})
export class WorkadventureService {

  initialized: boolean = false;
  player?: WorkadventurePlayerCommands;
  players: RemotePlayerInterface[] = [];

  constructor() { }

  async init() {
    WA.onInit().then(async () => {
      console.log('Scripting API ready inside iFrame');
      this.player = WA.player;
      await WA.players.configureTracking();

      setInterval(async () => {
        this.players = Array.from(WA.players.list());
      }, 1000);
    }).catch(e => console.error(e));
  }
}
