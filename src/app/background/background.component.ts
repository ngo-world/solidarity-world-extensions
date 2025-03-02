import { Component, OnInit } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import {
  BroadcastEvents,
  PlayerStateVariables,
  WorkadventureService,
  WorldTime,
} from '../workadventure.service';
import {
  Position,
  WorkadventurePlayerCommands,
} from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { CommonModule } from '@angular/common';
import { isBefore } from 'date-fns';
import {
  PlaySoundEvent,
  SetVariableEvent,
  TeleportEvent,
} from '../admin-dashboard/admin-dashboard.component';
import { CallRequest, Contact } from '../smartphone/smartphone.component';
import { Popup, Sound } from '@workadventure/iframe-api-typings';

export enum Areas {
  FLOOR_CELLAR = 'floor-cellar',
  LABYRINTH_START = 'StartLabyrinth',
  WIN_ZOOM = 'WinZoom',
  GAMEOVER_ZOOM = 'GameoverZoom',
}

export interface UserInfo {
  id: number;
  requestId: number;
  playerUUID: string;
  playerName: string;
  documentLink: string | undefined;
  phoneNumbers: Contact[];
  phoneDisabled: boolean;
  currentCall: CallRequest;
  position: Position;
}

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './background.component.html',
  styleUrl: './background.component.scss',
})
export class BackgroundComponent implements OnInit {
  // ToDo: https://directory.audio/sound-effects/alarms/23085-alarm-clock-simple
  countdownSound: Sound = WA.sound.loadSound(
    '/map-storage/maps/alarm-clock-going-off.mp3',
  );
  worldtime: WorldTime = {
    date: new Date(),
    offsetInSeconds: 0,
  };

  player?: WorkadventurePlayerCommands;
  currentCountdownDate?: Date;
  api: unknown;
  countdownTimer?: Subscription;

  constructor(private workadventureService: WorkadventureService) {}

  async ngOnInit(): Promise<void> {
    console.info('BackgroundComponent.ngOnInit');
    await this.workadventureService.init();
    await this.workadventureService.initUser();
    this.player = this.workadventureService.player!;
    console.info('Player', this.player);

    this.addAreaListeners();
    this.addPopups();

    this.listenToDocumentChanges();
    /*
    const website = WA.room.website.create({
      name: 'car',
      url: `${WorkadventureService.getRoomConfig().solidarityWorldExtensionsUrl}/car`,
      position: {
        x: 1000,
        y: 1000,
        width: 305,
        height: 165,
      },
      visible: true,
      allowApi: true,
      allow: 'fullscreen',
      origin: 'map',
      scale: 1,
    });

    WA.player.onPlayerMove((x) => {
      website.x = x.x - 150;
      website.y = x.y - 80;
    });

    function getRandomArbitrary(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    setInterval(() => {
      WA.player.moveTo(
        getRandomArbitrary(0, 1000),
        getRandomArbitrary(0, 1000),
        30,
      );
    }, 1000);
    */

    this.workadventureService.eventsSubject.subscribe((event) => {
      switch (event.name) {
        case BroadcastEvents.PLAY_SOUND:
          this.playSound(event.data! as PlaySoundEvent);
          break;
        case BroadcastEvents.SET_VARIABLE:
          this.onEventSetVariable(event.data as SetVariableEvent);
          break;
        case BroadcastEvents.JOIN_BROADCAST: {
          const roomname = event.data! as string;
          this.joinBroadcast(roomname);
          break;
        }
        case BroadcastEvents.SHARE_USER_INFO:
          this.onEventShareUserInfo(event.data as number);
          break;
        case BroadcastEvents.TELEPORT:
          this.onEventTeleport(event.data as TeleportEvent);
          break;
        default:
          break;
      }
    });

    this.setCurrentCountdownDate();

    WA.state
      .onVariableChange(
        WorkadventureService.ROOM_STATE_VARIABLE_COUNTDOWN_TO_DATE,
      )
      .subscribe(() => {
        this.setCurrentCountdownDate();
      });

    this.worldtime = this.workadventureService.getVirtualWorldTime();

    WA.state
      .onVariableChange(WorkadventureService.ROOM_STATE_VARIABLE_WORLD_TIME)
      .subscribe(() => {
        // Important: do NOT use the value directy
        this.worldtime = this.workadventureService.getVirtualWorldTime();
      });
  }

  listenToDocumentChanges() {
    function addButtonIfNeccesary(documentLink: string) {
      WA.ui.actionBar.removeButton('openDocument');
      if (!documentLink) {
        return;
      }

      WA.ui.actionBar.addButton({
        id: 'openDocument',
        label: 'Document',
        callback: () => {
          WA.nav.openCoWebSite(documentLink);
        },
      });
    }
    WA.player.state
      .onVariableChange(PlayerStateVariables.DOCUMENT_LINK)
      .subscribe(() => {
        addButtonIfNeccesary(
          WA.player.state[PlayerStateVariables.DOCUMENT_LINK] as string,
        );
      });
  }

  addPopups() {
    WA.ui.openPopup(
      'PopupStartRoom',
      'Du bist aufgewacht in einem dunklen Keller. Pass auf: nur eine Tür führt in die Freiheit. Zum Glück hast du eine Nummer, die du anrufen kannst, um dir Hilfe zu holen.',
      [
        {
          label: 'Schließen',
          callback: function (popup: Popup): void {
            popup.close();
          },
        },
      ],
    );
    WA.ui.openPopup(
      'StartGame',
      `Willkommen zum Prototype Fund Demo Day Mini-Game! 

      1) Öffne und schließe dein virtuelles Smartphone über den "Smartphone" Knopf
      2) Das Spiel beginnt, sobald Du und dein Spielpartner die Startfelder betreten
      3) Einer von euch beiden geht ins Backoffice, die andere Person ins Labyrinth

      Viel Spaß!
      `,
      [
        {
          label: 'Schließen',
          callback: function (popup: Popup): void {
            popup.close();
          },
        },
      ],
    );
    WA.ui.openPopup(
      'PopupOffice',
      'Ein ganz normaler Tag im Büro, blick dich gerne um und schaue, welche Informationen du so findest.',
      [
        {
          label: 'Schließen',
          callback: function (popup: Popup): void {
            popup.close();
          },
        },
      ],
    );
  }
  async addAreaListeners() {
    const areaNames = (await this.workadventureService.getAreas()).map(
      (a) => a.name,
    );

    Object.values(Areas).map((a) => {
      if (areaNames.indexOf(a) < 0) {
        console.error(
          `Known area is not part of the map. Got: "${a}". Areas on the map: "${areaNames}"`,
        );
      }
    });

    console.info('Areas on the map', areaNames);
    console.info('Known areas', Object.values(Areas));
    areaNames.forEach((a) => {
      WA.room.area.onEnter(a).subscribe(() => this.enteredArea(a));
      WA.room.area.onLeave(a).subscribe(() => this.leftArea(a));
    });
  }

  enteredArea(name: string): void {
    switch (name) {
      case Areas.FLOOR_CELLAR:
        this.workadventureService.setPhoneEnabled(false);
        break;
      case Areas.GAMEOVER_ZOOM:
      case Areas.WIN_ZOOM:
      case Areas.LABYRINTH_START:
        WA.controls.disableWheelZoom();
        break;
      default:
        this.workadventureService.setPhoneEnabled(true);
        break;
    }
  }

  leftArea(name: string): void {
    switch (name) {
      case Areas.FLOOR_CELLAR:
        this.workadventureService.setPhoneEnabled(true);
        break;
      default:
        break;
    }
  }

  setCurrentCountdownDate() {
    this.currentCountdownDate = this.workadventureService.getCountdownDate();
    this.countdownTimer?.unsubscribe();
    if (this.currentCountdownDate && this.currentCountdownDate > new Date()) {
      this.countdownTimer = timer(this.currentCountdownDate!).subscribe(() => {
        this.countdownSound.play({});
      });
    }
  }

  onEventTeleport(event: TeleportEvent) {
    if (event.playerUUID !== this.player!.uuid) {
      return;
    }
    WA.player.teleport(event.x, event.y);
  }

  onEventSetVariable(setVariableEvent: SetVariableEvent) {
    if (this.player!.uuid !== setVariableEvent.playerUUID) {
      return;
    }
    this.player?.state.saveVariable(
      setVariableEvent.variableName,
      setVariableEvent.variableValue,
      {
        persist: true,
        public: true,
        scope: 'world',
      },
    );
  }

  async onEventShareUserInfo(requestId: number) {
    const phoneNumbers = this.player?.state.loadVariable(
      PlayerStateVariables.PHONE_NUMBERS,
    ) as Contact[];
    const userInfo: UserInfo = {
      id: this.player!.playerId,
      requestId: requestId,
      playerUUID: this.player!.uuid!,
      playerName: this.player!.name,
      documentLink: this.player!.state[PlayerStateVariables.DOCUMENT_LINK] as
        | string
        | undefined,
      phoneNumbers,
      phoneDisabled: this.player!.state[
        PlayerStateVariables.PHONE_DISABLED
      ] as boolean,
      currentCall: this.player!.state[
        PlayerStateVariables.CALLING
      ] as CallRequest,
      position: await this.player!.getPosition(),
    };
    WA.event.broadcast(BroadcastEvents.SHARE_USER_INFO_RESPONSE, userInfo);
  }

  getCurrentCountdown(): string {
    if (!this.currentCountdownDate) return '';
    if (isBefore(this.currentCountdownDate, new Date())) {
      this.currentCountdownDate = undefined;
      return '';
    }
    const seconds =
      (this.currentCountdownDate.getTime() - new Date().getTime()) / 1000;
    return `${Math.floor(seconds / 60)} minutes and ${Math.floor(seconds % 60)} seconds`;
  }

  getCurrentTime(): string {
    const worldtimeDate =
      (new Date().getTime() - this.worldtime.date.getTime()) / 1000 +
      this.worldtime.offsetInSeconds;
    return (
      Math.floor((worldtimeDate / 60 / 60) % 24)
        .toString()
        .padStart(2, '0') +
      ':' +
      (Math.floor(worldtimeDate / 60) % 60).toString().padStart(2, '0')
    );
  }

  playSound(event: PlaySoundEvent) {
    if (event.playerIds.indexOf(WA.player.playerId) < 0) {
      return;
    }

    console.info(`Playing sound ${event.soundUrl}`);
    WA.sound.loadSound(event.soundUrl).play({
      volume: 1,
    });
  }
  joinBroadcast(roomName: string) {
    WA.ui.modal.openModal({
      title: 'broadcast',
      src: `${WorkadventureService.getRoomConfig().solidarityWorldExtensionsUrl}/broadcast?roomName=${roomName}`,
      allowApi: true,
      position: 'center',
      allow: 'microphone *; screen-wake-lock *; camera',
    });
  }
}
