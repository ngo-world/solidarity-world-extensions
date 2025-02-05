import { Component } from '@angular/core';
import { WorkadventureService } from '../workadventure.service';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';

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
    console.log(await WA.room.getTiledMap());

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
    const sound = WA.sound.loadSound(soundUrl);
    const config = {
      volume: 0.1,
      loop: false,
      rate: 1,
      detune: 1,
      delay: 0,
      seek: 0,
      mute: false
    }
    sound.play(config);
  }
}
