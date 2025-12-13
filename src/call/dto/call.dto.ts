export interface InitiateDirectCallDto {
  receiverId: string;
}

export interface InitiateGroupCallDto {
  roomId: string;
}

export interface CallInitiatedResponse {
  callId: string;
  agoraToken: string;
  agoraAppId: string;
  channelName: string;
  uid: number;
}
