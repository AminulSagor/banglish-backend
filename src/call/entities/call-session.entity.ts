import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";


export enum CallType {
    GROUP = 'GROUP',
    DIRECT = 'DIRECT'
}

export enum CallStatus {
    RINGING = 'RINGING',
    ONGOING = 'ONGOING',
    ENDED = 'ENDED'
}

export enum CallEndReason {
    COMPLETED = 'COMPLETED',
    MISSED = 'MISSED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED'
}

/**
 * Participant info for group calls
 * Stores mute state and role for each participant
 */
export interface ParticipantInfo {
    userId: string;
    isMuted: boolean;
    joinedAt: Date;
}


@Entity('call_sessions')
export class CallSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'caller_id' })
    callerId: string;

    @Column({ name: 'receiver_id', nullable: true })
    receiverId: string;

    @Column({ name: 'room_id', nullable: true })
    roomId: string;

    /**
     * Host of the group call (has mute/kick permissions)
     * For direct calls, this is null
     * Initially set to callerId, can be transferred
     */
    @Column({ name: 'host_id', nullable: true })
    hostId: string;

    @Column({ type: 'enum', enum: CallType, default: CallType.DIRECT, name: 'call_type' })
    callType: CallType;
    
    @Column({ type: 'enum', enum: CallStatus, default: CallStatus.RINGING, name: 'call_status' })
    callStatus: CallStatus;

    @Column({ type: 'enum', enum: CallEndReason, nullable: true, name: 'end_reason' })
    endReason: CallEndReason;

    @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
    startedAt: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'ended_at' })
    endedAt: Date;

    /**
     * Simple list of participant IDs (for backward compatibility)
     */
    @Column({ type: 'simple-array', default: '' })
    participants: string[];

    /**
     * Detailed participant info including mute state
     * Stored as JSON for flexibility
     */
    @Column({ type: 'simple-json', nullable: true, name: 'participant_details' })
    participantDetails: ParticipantInfo[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}