import { Component, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { WorkadventureService } from '../workadventure.service';
import { WorkadventurePlayerCommands } from '@workadventure/iframe-api-typings/play/src/front/Api/Iframe/player';
import { RemotePlayerInterface } from '@workadventure/iframe-api-typings';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { jitsiDomain } from '../smartphone/jitsi-options';


interface MapProperty { name: string; value: string; type: string; }

interface MapObject {
  name: string, x: number, y: number, width?: number, height?: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CardModule, ButtonModule, CommonModule, TableModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  player?: WorkadventurePlayerCommands
  players: RemotePlayerInterface[] = Array();
  api: any;
  objectsWithOpenWebsiteProperty: MapProperty[] = [];
  objects: MapObject[] = [];

  constructor(private workadventureService: WorkadventureService, private router: Router) {

  }

  async ngOnInit(): Promise<void> {
    const element = document.querySelector('html');
    element?.classList.toggle('dark-mode');

    console.log('ngOnInit');
    await this.workadventureService.init();


    this.player = this.workadventureService.player!;
    this.workadventureService.playersSubject.subscribe(players => {
      this.players = players;
      this.getCalls(players);
    });

    this.objectsWithOpenWebsiteProperty = await this.getAllDocumentLinksInMap();
    console.log(this.objectsWithOpenWebsiteProperty);


    const map = await WA.room.getTiledMap();
    this.objects = map.layers.filter(i => i.type == "objectgroup").map(i => i.objects).flat().sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAllDocumentLinksInMap() {
    const map = await WA.room.getTiledMap();
    return map.layers.map(l => ((l as any).objects || []) as { properties?: MapProperty[] }).flat().filter(i => !!i.properties && i.properties.length > 0).map(i => i.properties?.find(i => i.name == 'openWebsite')).filter(i => !!i);
  }

  getCalls(players: RemotePlayerInterface[]) {
    players.filter(i => !!i.state['calling']).map(i => i.state['calling'])
  }

  playSoundForAll(): void {
    // /map-storage/maps/guitar.mp3
    // https://aws-load-balancer.solidarity-world.de/guitar.mp3
    WA.event.broadcast("playSound", "/map-storage/maps/guitar.mp3");
  }

  joinCall(targetPlayer: RemotePlayerInterface): void {
    const roomName = targetPlayer.state['calling'] as string;
    window.open(`https://${jitsiDomain}/${roomName}`);
    //this.api = new (window as any).JitsiMeetExternalAPI(jitsiDomain, getJitsiConfig(roomName, 500, 500));
  }

  teleportToPlayer(targetPlayer: RemotePlayerInterface) {
    const position = targetPlayer.position;
    WA.player.teleport(position.x, position.y);
  }

  call(targetPlayer: RemotePlayerInterface) {
    const roomName = 'yeah';
    targetPlayer.sendEvent('requestedCall', roomName);
    window.open(`https://${jitsiDomain}/${roomName}`);
  }


  isAdmin(player: RemotePlayerInterface) {
    return this.workadventureService.isUserAdmin(player.uuid);
  }

  teleportToObject(object: MapObject) {
    const middleX = object.x + ((object.width ?? 0) / 2);
    const middleY = object.y + ((object.height ?? 0) / 2);
    console.log(object, middleX, middleY);
    WA.player.teleport(middleX, middleY);
  }
}
