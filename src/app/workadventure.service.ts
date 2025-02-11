import { Injectable } from '@angular/core';
import {
  RemotePlayerInterface,
  ScriptingEvent,
} from '@workadventure/iframe-api-typings';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { formatISO, parseISO } from 'date-fns';
import { Subject } from 'rxjs';
import { CallRequest } from './smartphone/smartphone.component';
import { UserInfo } from './background/background.component';

const ADMIN_UUIDS: string[] = ['info@davidgengenbach.de'];

export interface MapConfig {
  solidarityWorldExtensionsUrl: string;
  jitsiDomain: string;
}

export interface WorldTime {
  date: Date;
  offsetInSeconds: number;
}

interface MapProperty {
  name: string;
  value: string;
  type: string;
}

export enum PlayerStateVariables {
  PHONE_NUMBERS = 'phoneNumbers',
  PHONE_DISABLED = 'phoneDisabled',
  SMARTPHONE_SHOWN = 'smartphoneShown',
  CALLING = 'calling',
  DOCUMENT_LINK = 'documentLink',
}

export enum BroadcastEvents {
  REQUEST_CALL = 'requestCall',
  CALL_DECLINED = 'callDeclined',
  PLAY_SOUND = 'playSound',
  JOIN_BROADCAST = 'joinBroadcast',
  SET_VARIABLE = 'setVariable',
  SHARE_USER_INFO = 'shareUserInfo',
  SHARE_USER_INFO_RESPONSE = 'shareUserInfoResponse',
  TELEPORT = 'teleport',
}

@Injectable({
  providedIn: 'root',
})
export class WorkadventureService {
  static ROOM_STATE_VARIABLE_COUNTDOWN_TO_DATE = 'countdownToDate';
  static ROOM_STATE_VARIABLE_WORLD_TIME = 'worldTime';

  playersSubject = new Subject<RemotePlayerInterface[]>();
  eventsSubject = new Subject<ScriptingEvent>();

  player?: WorkadventurePlayerCommands;

  players: RemotePlayerInterface[] = [];

  async init() {
    console.log('WorkadventureService.init');
    await WA.onInit();
    this.player = WA.player;
    await WA.players.configureTracking();

    setInterval(async () => {
      this.players = Array.from(WA.players.list());
      this.playersSubject.next(this.players);
    }, 150);

    Object.values(BroadcastEvents).forEach((eventName) =>
      WA.event.on(eventName).subscribe((e) => {
        this.eventsSubject.next(e);
      }),
    );
  }

  async initUser() {
    if (!WA.player.state.hasVariable('phoneNumbers')) {
      const phoneNumber = WorkadventureService.getRandomPhoneNumber();
      console.info(`Saving random phone number: ${phoneNumber}`);
      WA.player.state.saveVariable(
        'phoneNumbers',
        [{ contactName: '', phoneNumber }],
        {
          public: true,
          persist: true,
          scope: 'world',
        },
      );
    }

    WA.controls.disableInviteButton();

    if (!WorkadventureService.currentUserIsAdmin()) {
      WA.controls.disableMapEditor();
      WA.controls.disableScreenSharing();
      WA.controls.disableWheelZoom();
      // WA.controls.disableRightClick();
      // WA.controls.disableMicrophone();
      // WA.controls.disableWebcam();
    }

    await WA.player.state.saveVariable('smartphoneShown', false);

    WA.ui.actionBar.addButton({
      id: 'toggleSmartPhoneButton',
      label: 'Toggle smartphone',
      callback: async () => {
        WA.player.state.saveVariable(
          'smartphoneShown',
          !WA.player.state['smartphoneShown'],
        );
      },
    });

    if (WorkadventureService.currentUserIsAdmin()) {
      WA.ui.actionBar.addButton({
        id: 'openAdminDashboard',
        label: 'Open admin dashboard',
        callback: () => WorkadventureService.openAdminDashboard(),
      });
    }
  }

  isUserAdmin(userUuid: string): boolean {
    return ADMIN_UUIDS.indexOf(userUuid) >= 0;
  }

  isCurrentUserAdmin() {
    return this.isUserAdmin(this.player?.uuid || 'Not an admin');
  }

  setCountdownDate(countdownDate?: Date) {
    WA.state.saveVariable(
      WorkadventureService.ROOM_STATE_VARIABLE_COUNTDOWN_TO_DATE,
      formatISO(countdownDate || new Date()),
    );
  }

  getCountdownDate(): Date | undefined {
    const val = WA.state.loadVariable(
      WorkadventureService.ROOM_STATE_VARIABLE_COUNTDOWN_TO_DATE,
    ) as string | undefined;
    return val ? parseISO(val) : new Date();
  }

  setVirtualWorldTime(worldTime: WorldTime) {
    WA.state.saveVariable(WorkadventureService.ROOM_STATE_VARIABLE_WORLD_TIME, {
      date: formatISO(worldTime.date),
      offsetInSeconds: worldTime.offsetInSeconds,
    });
  }

  getPlayerById(id: number): RemotePlayerInterface | undefined {
    return WA.players.get(id);
  }

  getVirtualWorldTime(): WorldTime {
    const val = WA.state.loadVariable(
      WorkadventureService.ROOM_STATE_VARIABLE_WORLD_TIME,
    ) as { date: string; offsetInSeconds: number } | undefined;
    if (!val) {
      return {
        date: new Date(),
        offsetInSeconds: 0,
      };
    }

    return {
      date: parseISO(val.date),
      offsetInSeconds: val.offsetInSeconds,
    };
  }

  static requestCall(callRequest: CallRequest) {
    WA.event.broadcast(BroadcastEvents.REQUEST_CALL, callRequest);
    //targetPlayer.sendEvent('requestedCall', callRequest);
  }

  static getRandomPhoneNumber() {
    const min = 330000000;
    const max = 509999999;
    const randomNumber = Math.floor(Math.random() * (max - min) + min);
    return `+${randomNumber}`;
  }

  static getRoomConfig(): MapConfig {
    //return JSON.parse(WA.state.loadVariable('config') as string) as MapConfig;
    return {
      solidarityWorldExtensionsUrl: 'https://localhost:4200',
      jitsiDomain: 'jitsi-meet.solidarity-world.de',
    };
  }

  static openAdminDashboard() {
    WA.ui.modal.openModal({
      title: 'adminDashboard',
      src: `${WorkadventureService.getRoomConfig().solidarityWorldExtensionsUrl}/admin-dashboard`,
      allowApi: true,
      position: 'center',
      allow: null,
    });
  }

  static currentUserIsAdmin(): boolean {
    return WorkadventureService.isAdmin(WA.player.uuid!);
  }

  static isAdmin(uuid: string): boolean {
    return ADMIN_UUIDS.indexOf(uuid) >= 0;
  }

  static async getAllDocumentLinksInMap() {
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

  async getPlayerInfos(): Promise<UserInfo[]> {
    const requestId = Math.random();
    const userInfos: UserInfo[] = [];
    const subscription = this.eventsSubject.subscribe((event) => {
      if (event.name !== BroadcastEvents.SHARE_USER_INFO_RESPONSE) {
        return;
      }
      const userInfo = event.data as UserInfo;
      if (userInfo.requestId === requestId) {
        userInfos.push(userInfo);
      }
    });

    WA.event.broadcast(BroadcastEvents.SHARE_USER_INFO, requestId);

    return new Promise((resolveInner) => {
      setTimeout(() => {
        subscription.unsubscribe();
        userInfos.sort((a, b) => a.playerName.localeCompare(b.playerName));
        resolveInner(userInfos);
      }, 500);
    });
  }
}
