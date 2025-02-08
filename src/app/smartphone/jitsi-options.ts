export const jitsiDomain = 'jitsi-meet.solidarity-world.de';
//export const jitsiDomain: String = "meet.ffrn.de";

export function getRoomName(playerId1: number, playerId2: number) {
  return `sadjlaskjdal_${playerId1}_to_${playerId2}`;
}

export function getJitsiConfig(
  roomName: string,
  joiningBroadcast: boolean,
  width?: number,
  height?: number,
) {
  /*
    No broadcast:
        testing: {
            noAutoPlayVideo: true
        },
        startAudioOnly: true,
        startWithAudioMuted: false,
        startVideoMuted: false,
        startWithVideoMuted: true,
    Broadcast:
        testing: {
            noAutoPlayVideo: true
        },
        startAudioOnly: false,
        startWithAudioMuted: true,
        startVideoMuted: true,
        startWithVideoMuted: true,
    */
  return {
    width: width,
    height: height,
    roomName: roomName,
    // https://github.com/jitsi/jitsi-meet/blob/master/interface_config.js
    interfaceConfigOverwrite: {
      DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
      DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
      DISABLE_PRESENCE_STATUS: true,
      DISPLAY_WELCOME_FOOTER: false,
      RECENT_LIST_ENABLED: false,
      SHOW_JITSI_WATERMARK: false,
      VIDEO_QUALITY_LABEL_DISABLED: true,
    },
    // https://github.com/jitsi/jitsi-meet/blob/master/config.js
    configOverwrite: {
      testing: {
        noAutoPlayVideo: true,
      },
      startAudioOnly: !joiningBroadcast,
      startWithAudioMuted: joiningBroadcast,
      startVideoMuted: joiningBroadcast,
      startWithVideoMuted: true,
      disableModeratorIndicator: true,
      disableReactions: true,
      disableReactionsModeration: true,
      disablePolls: true,
      disableSelfDemote: true,
      disableSelfView: true,
      disableSelfViewSettings: true,
      screenshotCapture: {
        enabled: false,
      },
      localRecording: {
        enabled: true,
        notifyAllParticipants: false,
      },
      transcription: {
        enabled: false,
      },
      connectionIndicators: {},
      hideLobbyButton: true,
      requireDisplayName: false,
      prejoinConfig: {
        enabled: false,
      },
      welcomePage: {
        enabled: false,
      },
      lobby: {
        enableChat: false,
      },
      securityUi: {
        hideLobbyButton: true,
        disableLobbyPassword: true,
      },
      disableShortcuts: true,
      defaultRemoteDisplayName: 'Anderer User',
      hideDisplayName: true,
      hideDominantSpeakerBadge: true,
      hideEmailInSettings: true,
      toolbarButtons: [],
      toolbarConfig: {
        alwaysVisible: false,
      },
      mainToolbarButtons: [],
      participantsPane: {
        enabled: false,
      },
      breakoutRooms: {
        hideAddRoomButton: true,
      },
    },
  };
}
