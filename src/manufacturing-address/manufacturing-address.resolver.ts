import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ManufacturingAddressService } from './manufacturing-address.service';
import { ManufacturingAddress } from './manufacturing-address.schema';
import {
  CreateManufacturingAddressInput,
  UpdateManufacturingAddressInput,
} from './manufacturing-address.input';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { PaginatedManufacturingAddresses } from './manufacturing-address.pagination';
import { PaginationInput } from '../common/pagination';

@Resolver(() => ManufacturingAddress)
@UseGuards(JwtAuthGuard)
export class ManufacturingAddressResolver {
  constructor(
    private readonly manufacturingAddressService: ManufacturingAddressService,
  ) {}

  /**
   * Get all manufacturing addresses with pagination
   * Accessible by Admin only
   */
  @Query(() => PaginatedManufacturingAddresses, { name: 'manufacturingAddresses' })
  @Roles(Role.ADMIN)
  async getManufacturingAddresses(
    @Args('pagination', {
      type: () => PaginationInput,
      defaultValue: { page: 1, limit: 10 },
    })
    pagination: PaginationInput,
  ): Promise<PaginatedManufacturingAddresses> {
    const result = await this.manufacturingAddressService.findAllPaginated(
      pagination.page,
      pagination.limit,
    );
    return {
      items: result.items as ManufacturingAddress[],
      meta: result.meta,
    };
  }

  /**
   * Get a single manufacturing address by ID
   * Accessible by Admin only
   */
  @Query(() => ManufacturingAddress, { name: 'manufacturingAddress' })
  @Roles(Role.ADMIN)
  async getManufacturingAddress(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ManufacturingAddress> {
    return this.manufacturingAddressService.findOne(id);
  }

  /**
   * Get a manufacturing address by batch code
   * Accessible by Admin only
   */
  @Query(() => ManufacturingAddress, { name: 'manufacturingAddressByBatchCode' })
  @Roles(Role.ADMIN)
  async getManufacturingAddressByBatchCode(
    @Args('batchCode', { type: () => String }) batchCode: string,
  ): Promise<ManufacturingAddress> {
    return this.manufacturingAddressService.findByBatchCode(batchCode);
  }

  /**
   * Get all active manufacturing addresses
   * Accessible by Admin only
   */
  @Query(() => [ManufacturingAddress], { name: 'activeManufacturingAddresses' })
  @Roles(Role.ADMIN)
  async getActiveManufacturingAddresses(): Promise<ManufacturingAddress[]> {
    return this.manufacturingAddressService.findAllActive();
  }

  /**
   * Create a new manufacturing address
   * Accessible by Admin only
   */
  @Mutation(() => ManufacturingAddress, { name: 'createManufacturingAddress' })
  @Roles(Role.ADMIN)
  async createManufacturingAddress(
    @Args('input') input: CreateManufacturingAddressInput,
  ): Promise<ManufacturingAddress> {
    return this.manufacturingAddressService.create(input);
  }

  /**
   * Update a manufacturing address
   * Accessible by Admin only
   */
  @Mutation(() => ManufacturingAddress, { name: 'updateManufacturingAddress' })
  @Roles(Role.ADMIN)
  async updateManufacturingAddress(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateManufacturingAddressInput,
  ): Promise<ManufacturingAddress> {
    return this.manufacturingAddressService.update(id, input);
  }

  /**
   * Delete a manufacturing address
   * Accessible by Admin only
   */
  @Mutation(() => ManufacturingAddress, { name: 'deleteManufacturingAddress' })
  @Roles(Role.ADMIN)
  async deleteManufacturingAddress(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ManufacturingAddress> {
    return this.manufacturingAddressService.delete(id);
  }

  /**
   * Toggle active status of a manufacturing address
   * Accessible by Admin only
   */
  @Mutation(() => ManufacturingAddress, { name: 'toggleManufacturingAddressActive' })
  @Roles(Role.ADMIN)
  async toggleManufacturingAddressActive(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ManufacturingAddress> {
    return this.manufacturingAddressService.toggleActive(id);
  }
}
