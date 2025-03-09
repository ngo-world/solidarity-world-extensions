import { Injectable } from '@angular/core';
import { SignJWT } from 'jose';
import {
  LocalParticipant,
  LocalTrackPublication,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';

@Injectable({
  providedIn: 'root',
})
export class LivekitClientService {
  // ToDo (2025-03-09): this should NOT be hardcoded
  private static LIVEKIT_API_KEY_ID = 'API4Dz2iqBExuny';
  // ToDo (2025-03-09): this should NOT be hardcoded
  private static LIVEKIT_API_SECRET =
    'AZiffwejs3PssC2H98eIxLhjSLvwpur3Wufdh54f9IsJ';
  // ToDo (2025-03-09): this should NOT be hardcoded
  private static LIVEKIT_API_URL = 'https://livekit.solidarity-world.de';

  static async joinRoom(
    roomName: string,
    playerName: string,
    onParticipantJoined: () => void,
    onParticipantLeft: () => void,
  ): Promise<Room> {
    const jwtToken = await this.getJwtToken(roomName, playerName);
    return await this.connectToRoom(
      jwtToken,
      onParticipantJoined,
      onParticipantLeft,
    );
  }

  private static async connectToRoom(
    token: string,
    onParticipantJoined: () => void,
    onParticipantLeft: () => void,
  ): Promise<Room> {
    const elements: HTMLMediaElement[] = [];
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // pre-warm connection, this can be called as early as your page is loaded
    room.prepareConnection(this.LIVEKIT_API_URL, token);

    // set up event listeners
    room
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.Disconnected, handleDisconnect)
      .on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

    (async () => {
      await room.connect(this.LIVEKIT_API_URL, token);
      console.log('Connected to room', room.name);
      console.log('Participant name', room.localParticipant.name);
      await room.localParticipant.setMicrophoneEnabled(true);
      //await room.localParticipant.setCameraEnabled(true);
    })();

    function handleTrackSubscribed(
      track: RemoteTrack,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      publication: RemoteTrackPublication,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      participant: RemoteParticipant,
    ) {
      console.warn('handleTrackSubscribed');
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        const element = track.attach();
        document.body.appendChild(element);
        elements.push(element);
        onParticipantJoined();
      }
    }

    function handleTrackUnsubscribed(
      track: RemoteTrack,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      publication: RemoteTrackPublication,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      participant: RemoteParticipant,
    ) {
      console.warn('TrackUnsubscribed');
      onParticipantLeft();
      track.detach();
    }

    function handleLocalTrackUnpublished(
      publication: LocalTrackPublication,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      participant: LocalParticipant,
    ) {
      console.warn('LocalTrackUnpublished');
      // when local tracks are ended, update UI to remove them from rendering
      publication.track?.detach();
    }

    function handleDisconnect() {
      console.warn('Disconnected');
      elements.forEach((e) => e.remove());
    }

    return room;
  }

  private static async getJwtToken(
    roomName: string,
    playerName: string,
  ): Promise<string> {
    const secret = new TextEncoder().encode(this.LIVEKIT_API_SECRET);

    return await new SignJWT({
      iss: this.LIVEKIT_API_KEY_ID,
      name: playerName,
      sub: playerName,
      video: {
        room: roomName,
        roomJoin: true,
      },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('100h')
      .setNotBefore(new Date())
      .sign(secret);
  }
}
