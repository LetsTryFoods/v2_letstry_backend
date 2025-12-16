import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AddressService } from './address.service';
import { Address } from './address.schema';
import { CreateAddressInput, UpdateAddressInput, GeocodeAddressInput, ReverseGeocodeInput, SearchPlacesInput, PlaceDetailsInput } from './address.input';
import { GoogleMapsAddressOutput, PlacePredictionOutput, PlaceDetailsOutput, PhoneCheckOutput } from './address.graphql';
import { DualAuthGuard } from '../authentication/common/dual-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';

@Resolver(() => Address)
export class AddressResolver {
  constructor(private readonly addressService: AddressService) {}
  @Public()
  @UseGuards(DualAuthGuard)
  @Query(() => [Address], { name: 'myAddresses' })
  async getMyAddresses(@CurrentUser() user: any): Promise<Address[]> {
    return this.addressService.getAddresses(user._id);
  }

  @Public()
  @UseGuards(DualAuthGuard)
  @Query(() => Address, { name: 'address' })
  async getAddress(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ): Promise<Address> {
    return this.addressService.getAddress(id, user._id);
  }

  @Public()
  @UseGuards(DualAuthGuard)
  @Mutation(() => Address, { name: 'createAddress' })
  async createAddress(
    @Args('input') input: CreateAddressInput,
    @CurrentUser() user: any,
  ): Promise<Address> {
    return this.addressService.createAddress(user._id, input);
  }

  @Public()
  @UseGuards(DualAuthGuard)
  @Mutation(() => Address, { name: 'updateAddress' })
  async updateAddress(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAddressInput,
    @CurrentUser() user: any,
  ): Promise<Address> {
    return this.addressService.updateAddress(id, user._id, input);
  }

  @Public()
  @UseGuards(DualAuthGuard)
  @Mutation(() => Address, { name: 'deleteAddress' })
  async deleteAddress(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ): Promise<Address> {
    return this.addressService.deleteAddress(id, user._id);
  }

  @Public()
  @UseGuards(DualAuthGuard)
  @Query(() => GoogleMapsAddressOutput, { name: 'geocodeAddress' })
  async geocodeAddress(
    @Args('input') input: GeocodeAddressInput,
  ): Promise<GoogleMapsAddressOutput> {
    return this.addressService.geocodeAddress(input.address);
  }

  @Public()
  @UseGuards(DualAuthGuard)
  @Query(() => GoogleMapsAddressOutput, { name: 'reverseGeocode' })
  async reverseGeocode(
    @Args('input') input: ReverseGeocodeInput,
  ): Promise<GoogleMapsAddressOutput> {
    return this.addressService.reverseGeocode(input.latitude, input.longitude);
  }

  @Public()
  @UseGuards(DualAuthGuard)
  @Query(() => [PlacePredictionOutput], { name: 'searchPlaces' })
  async searchPlaces(
    @Args('input') input: SearchPlacesInput,
  ): Promise<PlacePredictionOutput[]> {
    return this.addressService.searchPlaces(input.query, input.sessionToken);
  }

  @Public()
  @UseGuards(DualAuthGuard)
  @Query(() => PlaceDetailsOutput, { name: 'getPlaceDetails' })
  async getPlaceDetails(
    @Args('input') input: PlaceDetailsInput,
  ): Promise<PlaceDetailsOutput> {
    return this.addressService.getPlaceDetails(input.placeId, input.sessionToken);
  }

  @Public()
  @Query(() => PhoneCheckOutput, { name: 'checkPhoneExists' })
  async checkPhoneExists(
    @Args('phoneNumber') phoneNumber: string,
  ): Promise<PhoneCheckOutput> {
    return this.addressService.checkPhoneExists(phoneNumber);
  }
}
