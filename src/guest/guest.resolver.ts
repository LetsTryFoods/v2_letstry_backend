import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { GuestService } from './guest.service';
import { Guest } from './guest.schema';
import { CreateGuestInput, UpdateGuestInput } from './guest.input';
import { Public } from '../common/decorators/public.decorator';
import { WinstonLoggerService } from '../logger/logger.service';

@Resolver(() => Guest)
export class GuestResolver {
  constructor(
    private readonly guestService: GuestService,
    private readonly logger: WinstonLoggerService,
  ) {}

  @Query(() => Guest, { name: 'guest', nullable: true })
  @Public()
  async getGuest(@Args('id', { type: () => ID }) id: string): Promise<Guest | null> {
    this.logger.log('Resolver: getGuest called', { id }, 'GuestModule');
    return this.guestService.findOne(id);
  }

  @Query(() => Guest, { name: 'guestByGuestId', nullable: true })
  @Public()
  async getGuestByGuestId(@Args('guestId') guestId: string): Promise<Guest | null> {
    this.logger.log('Resolver: getGuestByGuestId called', { guestId }, 'GuestModule');
    return this.guestService.findByGuestId(guestId);
  }

  @Mutation(() => Guest, { name: 'createGuest' })
  @Public()
  async createGuest(
    @Args('input') input: CreateGuestInput,
    @Context() context: any,
  ): Promise<Guest> {
    this.logger.log('Resolver: createGuest called', { input }, 'GuestModule');
    const guest = await this.guestService.create(input);
    
    if (context.res) {
      context.res.cookie('guest_session', {
        guestId: guest.guestId,
        sessionId: guest.sessionId,
      }, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 360 * 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.krsna.site' : undefined,
      });
      this.logger.log('Resolver: guest_session cookie set', { guestId: guest.guestId }, 'GuestModule');
    }

    return guest;
  }

  @Mutation(() => Guest, { name: 'updateGuest' })
  @Public()
  async updateGuest(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateGuestInput,
  ): Promise<Guest> {
    this.logger.log('Resolver: updateGuest called', { id, input }, 'GuestModule');
    return this.guestService.update(id, input);
  }
}
