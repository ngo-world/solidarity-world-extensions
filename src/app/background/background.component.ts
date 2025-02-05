import { Component } from '@angular/core';
import { WorkadventureService } from '../workadventure.service';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { SoundConfig } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/Sound/Sound';

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [],
  templateUrl: './background.component.html',
  styleUrl: './background.component.scss'
})
export class BackgroundComponent {

  player?: WorkadventurePlayerCommands

  constructor(private workadventureService: WorkadventureService) {
    console.info("BackgroundComponent")
  }

  async ngOnInit(): Promise<void> {
    await this.workadventureService.init();
    this.player = this.workadventureService.player!;

    this.workadventureService.eventsSubject.subscribe(event => {
      console.log(event);
      switch (event.name) {
        case "playSound":
          this.playSound(event.data! as string);
          break;
        default:
          console.error("Received unknown event. Ignoring", event);
          break;
      }
    });
  }

  playSound(soundUrl: string) {
    console.info(`Playing sound ${soundUrl}`);

    WA.sound.loadSound(soundUrl).play({
      volume: 0.5
    });
  }
}
