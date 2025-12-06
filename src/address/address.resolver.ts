import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AddressService } from './address.service';
import { Address } from './address.schema';
import { CreateAddressInput, UpdateAddressInput } from './address.input';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver(() => Address)
@UseGuards(JwtAuthGuard)
export class AddressResolver {
  constructor(private readonly addressService: AddressService) {}

  @Query(() => [Address], { name: 'myAddresses' })
  async getMyAddresses(@CurrentUser() user: any): Promise<Address[]> {
    return this.addressService.getAddresses(user._id);
  }

  @Query(() => Address, { name: 'address' })
  async getAddress(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ): Promise<Address> {
    return this.addressService.getAddress(id, user._id);
  }

  @Mutation(() => Address, { name: 'createAddress' })
  async createAddress(
    @Args('input') input: CreateAddressInput,
    @CurrentUser() user: any,
  ): Promise<Address> {
    return this.addressService.createAddress(user._id, input);
  }

  @Mutation(() => Address, { name: 'updateAddress' })
  async updateAddress(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAddressInput,
    @CurrentUser() user: any,
  ): Promise<Address> {
    return this.addressService.updateAddress(id, user._id, input);
  }

  @Mutation(() => Address, { name: 'deleteAddress' })
  async deleteAddress(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ): Promise<Address> {
    return this.addressService.deleteAddress(id, user._id);
  }
}
