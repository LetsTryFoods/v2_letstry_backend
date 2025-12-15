import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Guest } from './guest.schema';
import { Identity, IdentityDocument, IdentityStatus } from '../common/schemas/identity.schema';
import { CreateGuestInput, UpdateGuestInput } from './guest.input';
import { WinstonLoggerService } from '../logger/logger.service';

@Injectable()
export class GuestService {
  constructor(
    @InjectModel(Identity.name) private identityModel: Model<IdentityDocument>,
    @InjectConnection() private connection: Connection,
    private readonly logger: WinstonLoggerService,
  ) {}

  async create(input: CreateGuestInput): Promise<Guest> {
    this.logger.log('Creating new guest', { input }, 'GuestModule');
    const identityId = uuidv4();
    const sessionId = uuidv4();
    
    const identity = await this.identityModel.create({
      ...input,
      identityId,
      currentSessionId: sessionId,
      sessionIds: [sessionId],
      status: IdentityStatus.GUEST,
      role: 'guest',
    });
    
    this.logger.log('Guest created successfully', { identityId, id: identity._id }, 'GuestModule');
    return this.mapToGuest(identity);
  }

  async findOne(id: string): Promise<Guest | null> {
    this.logger.log('Finding guest by ID', { id }, 'GuestModule');
    const identity = await this.identityModel.findOne({ 
      _id: id,
      status: IdentityStatus.GUEST 
    }).exec();
    if (!identity) {
      this.logger.warn('Guest not found by ID', { id }, 'GuestModule');
      return null;
    }
    return this.mapToGuest(identity);
  }

  async findByGuestId(guestId: string): Promise<Guest | null> {
    this.logger.log('Finding guest by guestId', { guestId }, 'GuestModule');
    const identity = await this.identityModel.findOne({ 
      identityId: guestId,
      status: IdentityStatus.GUEST 
    }).exec();
    if (!identity) {
      this.logger.warn('Guest not found by guestId', { guestId }, 'GuestModule');
      return null;
    }
    return this.mapToGuest(identity);
  }

  async findBySessionId(sessionId: string): Promise<Guest | null> {
    this.logger.log('Finding guest by sessionId', { sessionId }, 'GuestModule');
    const identity = await this.identityModel.findOne({ 
      currentSessionId: sessionId,
      status: IdentityStatus.GUEST 
    }).exec();
    if (!identity) {
      this.logger.warn('Guest not found by sessionId', { sessionId }, 'GuestModule');
      return null;
    }
    return this.mapToGuest(identity);
  }

  async update(id: string, input: UpdateGuestInput): Promise<Guest> {
    this.logger.log('Updating guest', { id, input }, 'GuestModule');
    const identity = await this.identityModel.findOneAndUpdate(
      { _id: id, status: IdentityStatus.GUEST },
      { ...input, lastActiveAt: new Date() },
      { new: true }
    ).exec();
    if (!identity) {
      this.logger.warn('Guest not found for update', { id }, 'GuestModule');
      throw new Error('Guest not found');
    }
    this.logger.log('Guest updated successfully', { id: identity._id }, 'GuestModule');
    return this.mapToGuest(identity);
  }

  async markAsConverted(sessionId: string, userId: string): Promise<void> {
    this.logger.log('Marking guest as converted', { sessionId, userId }, 'GuestModule');
    await this.identityModel.findOneAndUpdate(
      { currentSessionId: sessionId },
      { status: IdentityStatus.REGISTERED },
      { new: true }
    ).exec();
  }

  private mapToGuest(identity: IdentityDocument): Guest {
    return {
      _id: identity._id.toString(),
      guestId: identity.identityId,
      sessionId: identity.currentSessionId || '',
      createdAt: identity.createdAt,
      lastActiveAt: identity.lastActiveAt || identity.updatedAt,
      ipAddress: identity.ipAddress,
      deviceInfo: identity.deviceInfo,
      convertedToUserId: identity.status !== IdentityStatus.GUEST ? identity._id.toString() : undefined,
    };
  }

  getConnection(): Connection {
    return this.connection;
  }
}
