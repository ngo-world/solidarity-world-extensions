import { Injectable } from '@angular/core';
import { RemotePlayerInterface, ScriptingEvent } from '@workadventure/iframe-api-typings';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { formatISO, parse, parseISO } from 'date-fns';
import { Subject } from 'rxjs';

const ADMIN_UUIDS: string[] = ['info@davidgengenbach.de'];

export interface WorldTime {
  date: Date
  offsetInSeconds: number
}

@Injectable({
  providedIn: 'root'
})
export class WorkadventureService {
  static ROOM_STATE_VARIABLE_COUNTDOWN_TO_DATE = 'countdownToDate';
  static ROOM_STATE_VARIABLE_WORLD_TIME = 'worldTime';

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
      'playSound',
      'joinBroadcast'
    ].forEach(eventName => WA.event.on(eventName).subscribe((e) => this.eventsSubject.next(e)));

    WA.player.state.onVariableChange('smartphoneShown').subscribe((_) => { });
  }

  isUserAdmin(userUuid: string): boolean {
    return ADMIN_UUIDS.indexOf(userUuid) >= 0;
  }

  isCurrentUserAdmin() {
    return this.isUserAdmin(this.player?.uuid || 'Not an admin');
  }

  setCountdownDate(countdownDate?: Date) {
    WA.state.saveVariable(WorkadventureService.ROOM_STATE_VARIABLE_COUNTDOWN_TO_DATE, formatISO(countdownDate || new Date()));
  }

  getCountdownDate(): Date | undefined {
    const val = WA.state.loadVariable(WorkadventureService.ROOM_STATE_VARIABLE_COUNTDOWN_TO_DATE) as string | undefined;
    return val ? parseISO(val) : new Date();
  }

  setVirtualWorldTime(worldTime: WorldTime) {
    WA.state.saveVariable(WorkadventureService.ROOM_STATE_VARIABLE_WORLD_TIME, {
      date: formatISO(worldTime.date),
      offsetInSeconds: worldTime.offsetInSeconds
    });
  }
  getVirtualWorldTime(): WorldTime {
    const val = WA.state.loadVariable(WorkadventureService.ROOM_STATE_VARIABLE_WORLD_TIME) as { date: string, offsetInSeconds: number } | undefined;
    if (!val) {
      return {
        date: new Date(),
        offsetInSeconds: 0
      }
    }

    return {
      date: parseISO(val.date),
      offsetInSeconds: val.offsetInSeconds
    };
  }

  static getSolidarityWorldUrl() {
    const developerMode = WA.player.state.loadVariable('developerMode') || false;
    return developerMode ? "https://localhost:4200" : "https://web.solidarity-world.de";
  }
}
