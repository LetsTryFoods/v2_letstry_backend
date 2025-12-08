import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ChargesService } from './charges.service';
import { Charges } from './charges.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { CreateChargesInput } from './charges.input';
import { Public } from '../common/decorators/public.decorator';

@Resolver(() => Charges)
export class ChargesResolver {
  constructor(private readonly chargesService: ChargesService) {}

  @Query(() => Charges, { name: 'charges', nullable: true })
  @Public()
  async getCharges(): Promise<Charges | null> {
    return this.chargesService.getCharges();
  }

  @Mutation(() => Charges)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createOrUpdateCharges(@Args('input') input: CreateChargesInput): Promise<Charges> {
    return this.chargesService.createOrUpdateCharges(input);
  }
}
