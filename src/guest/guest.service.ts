import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Guest, GuestDocument } from './guest.schema';
import { CreateGuestInput } from './guest.input';
import { WinstonLoggerService } from '../logger/logger.service';

@Injectable()
export class GuestService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    private readonly logger: WinstonLoggerService,
  ) {}

  async create(input: CreateGuestInput): Promise<Guest> {
    this.logger.log('Creating new guest', { input }, 'GuestModule');
    const { guest_id, session_id } = this.generateIds();
    
    const createdGuest = new this.guestModel({
      ...input,
      guest_id,
      session_id,
    });
    const savedGuest = await createdGuest.save();
    this.logger.log('Guest created successfully', { guestId: savedGuest.guest_id, id: savedGuest._id }, 'GuestModule');
    return savedGuest;
  }

  private generateIds(): { guest_id: string; session_id: string } {
    return {
      guest_id: uuidv4(),
      session_id: uuidv4(),
    };
  }

  async findOne(id: string): Promise<Guest | null> {
    this.logger.log('Finding guest by ID', { id }, 'GuestModule');
    const guest = await this.guestModel.findById(id).exec();
    if (!guest) {
      this.logger.warn('Guest not found by ID', { id }, 'GuestModule');
    }
    return guest;
  }

  async findByGuestId(guestId: string): Promise<Guest | null> {
    this.logger.log('Finding guest by guest_id', { guestId }, 'GuestModule');
    const guest = await this.guestModel.findOne({ guest_id: guestId }).exec();
    if (!guest) {
      this.logger.warn('Guest not found by guest_id', { guestId }, 'GuestModule');
    }
    return guest;
  }
}
