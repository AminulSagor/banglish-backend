import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class SendDirectMessageDto {
  @IsUUID()
  receiverId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}

export class SendRoomMessageDto {
  @IsUUID()
  roomId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}
