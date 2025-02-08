import { Component } from '@angular/core';
import { WorkadventureService, WorldTime } from '../workadventure.service';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { CommonModule } from '@angular/common';
import { isBefore } from 'date-fns';
import { getJitsiConfig, jitsiDomain } from '../smartphone/jitsi-options';

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [
    CommonModule

  ],
  templateUrl: './background.component.html',
  styleUrl: './background.component.scss'
})
export class BackgroundComponent {

  worldtime: WorldTime = {
    date: new Date(),
    offsetInSeconds: 0
  };

  player?: WorkadventurePlayerCommands
  currentCountdownDate?: Date;
  api: any;

  constructor(private workadventureService: WorkadventureService) {
    console.info("BackgroundComponent")
  }

  async ngOnInit(): Promise<void> {
    await this.workadventureService.init();
    this.player = this.workadventureService.player!;

    this.workadventureService.eventsSubject.subscribe(event => {
      console.log('Received event in background: ', event);
      switch (event.name) {
        case "playSound":
          this.playSound(event.data! as string);
          break;
        case "joinBroadcast":
          const roomname = event.data! as string;
          this.joinBroadcast(roomname);
          break;
        default:
          console.error("Received unknown event. Ignoring", event);
          break;
      }
    });

    this.currentCountdownDate = this.workadventureService.getCountdownDate();

    WA.state.onVariableChange(WorkadventureService.ROOM_STATE_VARIABLE_COUNTDOWN_TO_DATE).subscribe((value) => {
      this.currentCountdownDate = this.workadventureService.getCountdownDate();
    });

    this.worldtime = this.workadventureService.getVirtualWorldTime();

    WA.state.onVariableChange(WorkadventureService.ROOM_STATE_VARIABLE_WORLD_TIME).subscribe((value) => {
      // Important: do NOT use the value directy
      this.worldtime = this.workadventureService.getVirtualWorldTime();
    });
  }


  getCurrentCountdown(): string {
    if (!this.currentCountdownDate) return '';
    if (isBefore(this.currentCountdownDate, new Date())) {
      this.currentCountdownDate = undefined;
      return '';
    }
    const seconds = (this.currentCountdownDate.getTime() - new Date().getTime()) / 1000;
    return `${Math.floor(seconds / 60)} minutes and ${Math.floor(seconds % 60)} seconds`;
  }

  getCurrentTime(): string {
    const worldtimeDate = ((new Date().getTime() - this.worldtime.date.getTime()) / 1000) + this.worldtime.offsetInSeconds;
    return Math.floor(worldtimeDate / 60 / 60).toString().padStart(2, '0') + ':' + (Math.floor(worldtimeDate / 60) % 60).toString().padStart(2, '0');
  }


  playSound(soundUrl: string) {
    console.info(`Playing sound ${soundUrl}`);
    WA.sound.loadSound(soundUrl).play({
      volume: 1
    });
  }
  joinBroadcast(roomName: string) {
    WA.ui.modal.openModal({
      title: "broadcast",
      src: `${WorkadventureService.getSolidarityWorldUrl()}/broadcast?roomName=${roomName}`,
      allowApi: true,
      position: "center",
      allow: 'microphone *; screen-wake-lock *; camera',
    });
  }
}
