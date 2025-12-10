import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ChargesService } from './charges.service';
import { Charges } from './charges.schema';
import { CreateChargesInput } from './charges.input';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Public } from '../common/decorators/public.decorator';

@Resolver(() => Charges)
export class ChargesResolver {
  constructor(private readonly chargesService: ChargesService) {}

  @Query(() => Charges, { name: 'charges', nullable: true })
  @Public()
  async getCharges(): Promise<Charges | null> {
    return this.chargesService.getCharges();
  }

  @Mutation(() => Charges, { name: 'createOrUpdateCharges' })
  @Roles(Role.ADMIN)
  async createOrUpdateCharges(
    @Args('input') input: CreateChargesInput,
  ): Promise<Charges> {
    return this.chargesService.createOrUpdateCharges(input);
  }
}
