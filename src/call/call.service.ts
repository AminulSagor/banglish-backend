import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { CallSession, CallStatus, CallType, CallEndReason, ParticipantInfo } from './entities/call-session.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CallService {
  // No more in-memory tracking - all state is in DB
  // Timeouts are managed by ChatGateway (socket layer)

  constructor(
    @InjectRepository(CallSession)
    private callSessionRepo: Repository<CallSession>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private configService: ConfigService,
  ) {}

  /**
   * Generate Agora RTC token for a user to join a channel
   */
  generateAgoraToken(channelName: string, uid: number, role: 'publisher' | 'audience' = 'publisher'): string {
    const appId = this.configService.get<string>('AGORA_APPID');
    const appCertificate = this.configService.get<string>('AGORA_CIRTIFICATE');

    if (!appId || !appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs,
    );
  }

  /**
   * Convert UUID to numeric UID for Agora (Agora requires numeric UIDs)
   */
  generateNumericUid(userId: string): number {
    // Take first 8 chars of UUID (without dashes), convert to number
    const hex = userId.replace(/-/g, '').substring(0, 8);
    return parseInt(hex, 16) % 2147483647; // Keep within 32-bit int range
  }

  /**
   * Check if user is currently in a call (DB-based)
   * Checks for any RINGING or ONGOING call where user is a participant
   */
  async isUserBusy(userId: string): Promise<boolean> {
    const activeCall = await this.callSessionRepo
      .createQueryBuilder('call')
      .where('call.callStatus IN (:...statuses)', { 
        statuses: [CallStatus.RINGING, CallStatus.ONGOING] 
      })
      .andWhere(
        '(call.callerId = :userId OR call.receiverId = :userId OR call.participants LIKE :participantPattern)',
        { userId, participantPattern: `%${userId}%` }
      )
      .getOne();
    
    return !!activeCall;
  }

  /**
   * Get active call ID for a user (DB-based)
   */
  async getActiveCallId(userId: string): Promise<string | undefined> {
    const activeCall = await this.callSessionRepo
      .createQueryBuilder('call')
      .where('call.callStatus IN (:...statuses)', { 
        statuses: [CallStatus.RINGING, CallStatus.ONGOING] 
      })
      .andWhere(
        '(call.callerId = :userId OR call.receiverId = :userId OR call.participants LIKE :participantPattern)',
        { userId, participantPattern: `%${userId}%` }
      )
      .getOne();
    
    return activeCall?.id;
  }

  // Timeout management has moved to ChatGateway (socket layer)
  // since calls require socket connections anyway

  /**
   * Initiate a 1:1 direct call
   */
  async initiateDirectCall(callerId: string, receiverId: string): Promise<{
    callSession: CallSession;
    agoraToken: string;
    agoraAppId: string;
    uid: number;
  }> {
    // Check if caller is busy (DB-based)
    if (await this.isUserBusy(callerId)) {
      throw new BadRequestException('You are already in a call');
    }

    // Check if receiver is busy (DB-based)
    if (await this.isUserBusy(receiverId)) {
      throw new BadRequestException('User is busy in another call');
    }

    // Create call session - this automatically marks users as busy
    // because they appear in an active CallSession
    const callSession = this.callSessionRepo.create({
      callerId,
      receiverId,
      callType: CallType.DIRECT,
      callStatus: CallStatus.RINGING,
      participants: [callerId],
    });
    const saved = await this.callSessionRepo.save(callSession);

    // Generate Agora token for caller
    const uid = this.generateNumericUid(callerId);
    const agoraToken = this.generateAgoraToken(saved.id, uid, 'publisher');

    return {
      callSession: saved,
      agoraToken,
      agoraAppId: this.configService.get<string>('AGORA_APPID') || '',
      uid,
    };
  }

  /**
   * Initiate a group call
   */
  async initiateGroupCall(callerId: string, roomId: string): Promise<{
    callSession: CallSession;
    agoraToken: string;
    agoraAppId: string;
    uid: number;
  }> {
    // Check if caller is busy (DB-based)
    if (await this.isUserBusy(callerId)) {
      throw new BadRequestException('You are already in a call');
    }

    // Create call session for group - caller is automatically busy
    // because they appear in participants of an ONGOING call
    // Caller becomes the host with mute permissions
    const callSession = this.callSessionRepo.create({
      callerId,
      receiverId: '', // Not used for group calls
      roomId,
      hostId: callerId, // Caller is the host
      callType: CallType.GROUP,
      callStatus: CallStatus.ONGOING, // Group calls start immediately
      startedAt: new Date(),
      participants: [callerId],
      participantDetails: [{
        userId: callerId,
        isMuted: false,
        joinedAt: new Date(),
      }],
    });
    const saved = await this.callSessionRepo.save(callSession);

    // Generate Agora token for caller
    const uid = this.generateNumericUid(callerId);
    const agoraToken = this.generateAgoraToken(saved.id, uid, 'publisher');

    return {
      callSession: saved,
      agoraToken,
      agoraAppId: this.configService.get<string>('AGORA_APPID') || '',
      uid,
    };
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(callId: string, userId: string): Promise<{
    callSession: CallSession;
    agoraToken: string;
    agoraAppId: string;
    uid: number;
  }> {
    // Note: Timeout clearing is handled by ChatGateway
    const callSession = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!callSession) {
      throw new NotFoundException('Call not found');
    }

    if (callSession.callStatus !== CallStatus.RINGING) {
      throw new BadRequestException('Call is not ringing');
    }

    // Update call status
    callSession.callStatus = CallStatus.ONGOING;
    callSession.startedAt = new Date();
    callSession.participants = [...callSession.participants, userId];
    await this.callSessionRepo.save(callSession);

    // Generate token for receiver
    const uid = this.generateNumericUid(userId);
    const agoraToken = this.generateAgoraToken(callId, uid, 'publisher');

    return {
      callSession,
      agoraToken,
      agoraAppId: this.configService.get<string>('AGORA_APPID') || '',
      uid,
    };
  }

  /**
   * Join an ongoing group call
   */
  async joinGroupCall(callId: string, userId: string): Promise<{
    callSession: CallSession;
    agoraToken: string;
    agoraAppId: string;
    uid: number;
  }> {
    const callSession = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!callSession) {
      throw new NotFoundException('Call not found');
    }

    if (callSession.callType !== CallType.GROUP) {
      throw new BadRequestException('This is not a group call');
    }

    if (callSession.callStatus === CallStatus.ENDED) {
      throw new BadRequestException('Call has ended');
    }

    // Check if user is busy in another call (DB-based)
    const existingCallId = await this.getActiveCallId(userId);
    if (existingCallId && existingCallId !== callId) {
      throw new BadRequestException('You are already in another call');
    }

    // Add user to participants if not already
    // This marks them as busy since they appear in an active call
    if (!callSession.participants.includes(userId)) {
      callSession.participants = [...callSession.participants, userId];
      
      // Add to participantDetails with mute state
      const participantDetails = callSession.participantDetails || [];
      participantDetails.push({
        userId,
        isMuted: false,
        joinedAt: new Date(),
      });
      callSession.participantDetails = participantDetails;
      
      await this.callSessionRepo.save(callSession);
    }

    // Generate token
    const uid = this.generateNumericUid(userId);
    const agoraToken = this.generateAgoraToken(callId, uid, 'publisher');

    return {
      callSession,
      agoraToken,
      agoraAppId: this.configService.get<string>('AGORA_APPID') || '',
      uid,
    };
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(callId: string, userId: string): Promise<CallSession> {
    // Note: Timeout clearing is handled by ChatGateway
    const callSession = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!callSession) {
      throw new NotFoundException('Call not found');
    }

    if (callSession.receiverId !== userId) {
      throw new BadRequestException('You are not the receiver of this call');
    }

    // Setting status to ENDED automatically frees users
    // because isUserBusy checks for RINGING/ONGOING only
    callSession.callStatus = CallStatus.ENDED;
    callSession.endReason = CallEndReason.REJECTED;
    callSession.endedAt = new Date();
    await this.callSessionRepo.save(callSession);

    return callSession;
  }

  /**
   * Cancel an outgoing call (before answer)
   */
  async cancelCall(callId: string, userId: string): Promise<CallSession> {
    // Note: Timeout clearing is handled by ChatGateway
    const callSession = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!callSession) {
      throw new NotFoundException('Call not found');
    }

    if (callSession.callerId !== userId) {
      throw new BadRequestException('You are not the caller');
    }

    // Setting status to ENDED automatically frees users
    callSession.callStatus = CallStatus.ENDED;
    callSession.endReason = CallEndReason.CANCELLED;
    callSession.endedAt = new Date();
    await this.callSessionRepo.save(callSession);

    return callSession;
  }

  /**
   * End an ongoing call
   */
  async endCall(callId: string, userId: string): Promise<{ callSession: CallSession; duration: number }> {
    const callSession = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!callSession) {
      throw new NotFoundException('Call not found');
    }

    // For group calls, just remove this user from participants
    if (callSession.callType === CallType.GROUP) {
      callSession.participants = callSession.participants.filter(p => p !== userId);

      // If no participants left, end the call
      if (callSession.participants.length === 0) {
        callSession.callStatus = CallStatus.ENDED;
        callSession.endReason = CallEndReason.COMPLETED;
        callSession.endedAt = new Date();
      }

      await this.callSessionRepo.save(callSession);

      const duration = callSession.startedAt
        ? Math.floor((new Date().getTime() - callSession.startedAt.getTime()) / 1000)
        : 0;

      return { callSession, duration };
    }

    // For direct calls, end immediately
    // Setting status to ENDED automatically frees users
    callSession.callStatus = CallStatus.ENDED;
    callSession.endReason = CallEndReason.COMPLETED;
    callSession.endedAt = new Date();
    await this.callSessionRepo.save(callSession);

    // Calculate duration
    const duration = callSession.startedAt
      ? Math.floor((callSession.endedAt.getTime() - callSession.startedAt.getTime()) / 1000)
      : 0;

    return { callSession, duration };
  }

  /**
   * Mark call as missed (timeout)
   */
  async missCall(callId: string): Promise<CallSession> {
    const callSession = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!callSession) {
      throw new NotFoundException('Call not found');
    }

    if (callSession.callStatus !== CallStatus.RINGING) {
      return callSession; // Already answered or ended
    }

    // Setting status to ENDED automatically frees users
    callSession.callStatus = CallStatus.ENDED;
    callSession.endReason = CallEndReason.MISSED;
    callSession.endedAt = new Date();
    await this.callSessionRepo.save(callSession);

    return callSession;
  }

  /**
   * Get call by ID
   */
  async getCall(callId: string): Promise<CallSession> {
    const call = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!call) {
      throw new NotFoundException('Call not found');
    }
    return call;
  }

  /**
   * Get call history for a user
   */
  async getCallHistory(userId: string, page: number = 1, limit: number = 20): Promise<{
    calls: CallSession[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const [calls, total] = await this.callSessionRepo.findAndCount({
      where: [
        { callerId: userId },
        { receiverId: userId },
      ],
      order: { startedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      calls,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user info for call display
   */
  async getUserInfo(userId: string): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      profile: user.profile ? {
        fullName: user.profile.fullName,
        profilePicture: user.profile.profilePicture,
      } : null,
    };
  }

  // ==================== MUTE CONTROL ====================

  /**
   * Check if user is the host of a call
   */
  isHost(callSession: CallSession, userId: string): boolean {
    return callSession.hostId === userId;
  }

  /**
   * Get participant details for a user in a call
   */
  getParticipantDetails(callSession: CallSession, userId: string): ParticipantInfo | undefined {
    return callSession.participantDetails?.find(p => p.userId === userId);
  }

  /**
   * Mute/unmute yourself in a call
   * Any participant can mute/unmute themselves
   */
  async toggleSelfMute(callId: string, userId: string, isMuted: boolean): Promise<{
    callSession: CallSession;
    participant: ParticipantInfo;
  }> {
    const callSession = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!callSession) {
      throw new NotFoundException('Call not found');
    }

    if (callSession.callStatus !== CallStatus.ONGOING) {
      throw new BadRequestException('Call is not ongoing');
    }

    // Check if user is a participant
    if (!callSession.participants.includes(userId)) {
      throw new BadRequestException('You are not in this call');
    }

    // Update mute state in participantDetails
    let participantDetails = callSession.participantDetails || [];
    const participantIndex = participantDetails.findIndex(p => p.userId === userId);
    
    if (participantIndex === -1) {
      // Add participant details if missing (backward compatibility)
      participantDetails.push({
        userId,
        isMuted,
        joinedAt: new Date(),
      });
    } else {
      participantDetails[participantIndex].isMuted = isMuted;
    }

    callSession.participantDetails = participantDetails;
    await this.callSessionRepo.save(callSession);

    const participant = participantDetails.find(p => p.userId === userId)!;

    return { callSession, participant };
  }

  /**
   * Host mutes/unmutes a participant
   * Only the host can mute others; participants can only unmute themselves
   */
  async hostMuteParticipant(
    callId: string, 
    hostId: string, 
    targetUserId: string, 
    isMuted: boolean
  ): Promise<{
    callSession: CallSession;
    participant: ParticipantInfo;
  }> {
    const callSession = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!callSession) {
      throw new NotFoundException('Call not found');
    }

    if (callSession.callType !== CallType.GROUP) {
      throw new BadRequestException('Mute control is only available for group calls');
    }

    if (callSession.callStatus !== CallStatus.ONGOING) {
      throw new BadRequestException('Call is not ongoing');
    }

    // Verify the requester is the host
    if (!this.isHost(callSession, hostId)) {
      throw new ForbiddenException('Only the host can mute/unmute other participants');
    }

    // Host cannot unmute others (privacy: user must unmute themselves)
    if (!isMuted) {
      throw new BadRequestException('Host can only mute participants. Participants must unmute themselves.');
    }

    // Check if target is a participant
    if (!callSession.participants.includes(targetUserId)) {
      throw new BadRequestException('Target user is not in this call');
    }

    // Update mute state
    let participantDetails = callSession.participantDetails || [];
    const participantIndex = participantDetails.findIndex(p => p.userId === targetUserId);
    
    if (participantIndex === -1) {
      participantDetails.push({
        userId: targetUserId,
        isMuted: true,
        joinedAt: new Date(),
      });
    } else {
      participantDetails[participantIndex].isMuted = true;
    }

    callSession.participantDetails = participantDetails;
    await this.callSessionRepo.save(callSession);

    const participant = participantDetails.find(p => p.userId === targetUserId)!;

    return { callSession, participant };
  }

  /**
   * Transfer host role to another participant
   */
  async transferHost(callId: string, currentHostId: string, newHostId: string): Promise<CallSession> {
    const callSession = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!callSession) {
      throw new NotFoundException('Call not found');
    }

    if (callSession.callType !== CallType.GROUP) {
      throw new BadRequestException('Host transfer is only available for group calls');
    }

    if (!this.isHost(callSession, currentHostId)) {
      throw new ForbiddenException('Only the host can transfer host role');
    }

    if (!callSession.participants.includes(newHostId)) {
      throw new BadRequestException('New host must be a participant in the call');
    }

    callSession.hostId = newHostId;
    await this.callSessionRepo.save(callSession);

    return callSession;
  }

  /**
   * Host removes/kicks a participant from the call
   */
  async kickParticipant(callId: string, hostId: string, targetUserId: string): Promise<CallSession> {
    const callSession = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!callSession) {
      throw new NotFoundException('Call not found');
    }

    if (callSession.callType !== CallType.GROUP) {
      throw new BadRequestException('Kick is only available for group calls');
    }

    if (callSession.callStatus !== CallStatus.ONGOING) {
      throw new BadRequestException('Call is not ongoing');
    }

    // Verify the requester is the host
    if (!this.isHost(callSession, hostId)) {
      throw new ForbiddenException('Only the host can remove participants');
    }

    // Host cannot kick themselves
    if (targetUserId === hostId) {
      throw new BadRequestException('Host cannot kick themselves. Transfer host first or leave the call.');
    }

    // Check if target is a participant
    if (!callSession.participants.includes(targetUserId)) {
      throw new BadRequestException('User is not in this call');
    }

    // Remove from participants list
    callSession.participants = callSession.participants.filter(p => p !== targetUserId);

    // Remove from participantDetails
    if (callSession.participantDetails) {
      callSession.participantDetails = callSession.participantDetails.filter(
        p => p.userId !== targetUserId
      );
    }

    await this.callSessionRepo.save(callSession);

    return callSession;
  }

  /**
   * Get all participants with their mute status
   */
  async getParticipantsWithStatus(callId: string): Promise<{
    hostId: string;
    participants: ParticipantInfo[];
  }> {
    const callSession = await this.callSessionRepo.findOne({ where: { id: callId } });
    if (!callSession) {
      throw new NotFoundException('Call not found');
    }

    return {
      hostId: callSession.hostId,
      participants: callSession.participantDetails || [],
    };
  }
}
