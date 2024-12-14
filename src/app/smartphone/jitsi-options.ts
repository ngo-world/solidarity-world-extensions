export const jitsiDomain: String = "jitsi.solidarity-world.de";

export function getJitsiConfig(roomName: String) {
    return {
        width: 1,
        height: 1,
        roomName: roomName,
        // https://github.com/jitsi/jitsi-meet/blob/master/interface_config.js
        interfaceConfigOverwrite: {
            DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            DISABLE_PRESENCE_STATUS: true,
            DISPLAY_WELCOME_FOOTER: false,
            RECENT_LIST_ENABLED: false,
            SHOW_JITSI_WATERMARK: false,
            VIDEO_QUALITY_LABEL_DISABLED: true
        },
        // https://github.com/jitsi/jitsi-meet/blob/master/config.js
        configOverwrite: {
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
            testing: {
                noAutoPlayVideo: true
            },
            startAudioOnly: true,
            localRecording: {
                enabled: true,
                notifyAllParticipants: false,
            },
            startWithAudioMuted: false,
            startVideoMuted: 0,
            startWithVideoMuted: true,
            transcription: {
                enabled: false
            },
            connectionIndicators: {

            },
            hideLobbyButton: true,
            requireDisplayName: false,
            prejoinConfig: {
                enabled: false
            },
            welcomePage: {
                enabled: false
            },
            lobby: {
                enableChat: false
            },
            securityUi: {
                hideLobbyButton: true,
                disableLobbyPassword: true
            },
            disableShortcuts: true,
            defaultRemoteDisplayName: "Anderer User",
            hideDisplayName: true,
            hideDominantSpeakerBadge: true,
            hideEmailInSettings: true,
            toolbarButtons: [],
            toolbarConfig: {
                alwaysVisible: false
            },
            mainToolbarButtons: [],
            participantsPane: {
                enabled: false
            },
            breakoutRooms: {
                hideAddRoomButton: true
            }
        }
    };
}