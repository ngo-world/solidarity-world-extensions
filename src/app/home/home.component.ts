import { Component, OnInit } from '@angular/core';
import { LivekitClientService } from '../livekit-client.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  ngOnInit(): void {
    this.joinCall();
  }
  async joinCall() {
    await LivekitClientService.joinRoom(
      'some-room',
      `Test${getRandomInt(1, 1000)}`,
      () => {
        console.warn('Participant joined');
      },
      () => {
        console.warn('Participant left');
      },
    );
  }
}

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min); // Round up min
  max = Math.floor(max); // Round down max
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
