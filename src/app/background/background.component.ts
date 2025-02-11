import { Component, OnInit } from '@angular/core';
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
  SetVariableEvent,
  TeleportEvent,
} from '../admin-dashboard/admin-dashboard.component';
import { CallRequest, Contact } from '../smartphone/smartphone.component';

export interface UserInfo {
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
  worldtime: WorldTime = {
    date: new Date(),
    offsetInSeconds: 0,
  };

  player?: WorkadventurePlayerCommands;
  currentCountdownDate?: Date;
  api: unknown;

  constructor(private workadventureService: WorkadventureService) {}

  async ngOnInit(): Promise<void> {
    console.info('BackgroundComponent.ngOnInit');
    await this.workadventureService.init();
    await this.workadventureService.initUser();
    this.player = this.workadventureService.player!;
    console.info('Player', this.player);

    WA.ui.actionBar.addButton({
      id: 'openDocument',
      label: 'Open document',
      callback: () => {
        WA.nav.openCoWebSite(
          this.player!.state.loadVariable('document') as string,
        );
      },
    });

    this.workadventureService.eventsSubject.subscribe((event) => {
      switch (event.name) {
        case BroadcastEvents.PLAY_SOUND:
          this.playSound(event.data! as string);
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

    this.currentCountdownDate = this.workadventureService.getCountdownDate();

    WA.state
      .onVariableChange(
        WorkadventureService.ROOM_STATE_VARIABLE_COUNTDOWN_TO_DATE,
      )
      .subscribe(() => {
        this.currentCountdownDate =
          this.workadventureService.getCountdownDate();
      });

    this.worldtime = this.workadventureService.getVirtualWorldTime();

    WA.state
      .onVariableChange(WorkadventureService.ROOM_STATE_VARIABLE_WORLD_TIME)
      .subscribe(() => {
        // Important: do NOT use the value directy
        this.worldtime = this.workadventureService.getVirtualWorldTime();
      });
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

  playSound(soundUrl: string) {
    console.info(`Playing sound ${soundUrl}`);
    WA.sound.loadSound(soundUrl).play({
      volume: 1,
    });
  }
  joinBroadcast(roomName: string) {
    WA.ui.modal.openModal({
      title: 'broadcast',
      src: `${WorkadventureService.getSolidarityWorldUrl()}/broadcast?roomName=${roomName}`,
      allowApi: true,
      position: 'center',
      allow: 'microphone *; screen-wake-lock *; camera',
    });
  }
}
