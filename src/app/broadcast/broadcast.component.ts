import { Component, OnInit } from '@angular/core';
import { WorkadventureService } from '../workadventure.service';
import { getJitsiConfig, jitsiDomain } from '../smartphone/jitsi-options';

@Component({
  selector: 'app-broadcast',
  standalone: true,
  imports: [],
  templateUrl: './broadcast.component.html',
  styleUrl: './broadcast.component.scss'
})
export class BroadcastComponent implements OnInit {
  api: any;

  constructor(private workadventureService: WorkadventureService) { }

  async ngOnInit(): Promise<void> {
    await this.workadventureService.init();
    console.info("Initializing broadcast screen");
    const roomName = 'broadcast';
    this.api = new (window as any).JitsiMeetExternalAPI(jitsiDomain, getJitsiConfig(roomName, true));
  }
}
