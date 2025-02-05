import { Injectable } from '@angular/core';
import { RemotePlayerInterface, ScriptingEvent } from '@workadventure/iframe-api-typings';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WorkadventureService {
  playersSubject = new Subject<RemotePlayerInterface[]>();
  eventsSubject = new Subject<ScriptingEvent>();

  player?: WorkadventurePlayerCommands;

  async init() {
    await WA.onInit();
    this.player = WA.player;
    await WA.players.configureTracking();

    setInterval(async () => {
      this.playersSubject.next(Array.from(WA.players.list()));
    }, 150);

    [
      'requestedCall',
      'declinedCall',
      'playSound'
    ].forEach(eventName => WA.event.on(eventName).subscribe((e) => this.eventsSubject.next(e)));

    WA.player.state.onVariableChange('smartphoneShown').subscribe((_) => { });
  }
}
