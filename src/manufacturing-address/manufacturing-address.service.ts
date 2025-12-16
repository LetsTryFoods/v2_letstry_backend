import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ManufacturingAddress,
  ManufacturingAddressDocument,
} from './manufacturing-address.schema';
import {
  CreateManufacturingAddressInput,
  UpdateManufacturingAddressInput,
} from './manufacturing-address.input';
import { WinstonLoggerService } from '../logger/logger.service';
import { PaginationResult } from '../common/pagination';

@Injectable()
export class ManufacturingAddressService {
  constructor(
    @InjectModel(ManufacturingAddress.name)
    private manufacturingAddressModel: Model<ManufacturingAddressDocument>,
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * Create a new manufacturing address
   */
  async create(
    input: CreateManufacturingAddressInput,
  ): Promise<ManufacturingAddressDocument> {
    this.logger.log(
      'Creating manufacturing address',
      { input },
      'ManufacturingAddressModule',
    );

    // Check if batchCode already exists
    const existingAddress = await this.manufacturingAddressModel
      .findOne({ batchCode: input.batchCode })
      .exec();

    if (existingAddress) {
      throw new ConflictException(
        `Manufacturing address with batch code '${input.batchCode}' already exists`,
      );
    }

    const address = new this.manufacturingAddressModel(input);
    return address.save();
  }

  /**
   * Get all manufacturing addresses with pagination
   */
  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResult<ManufacturingAddressDocument>> {
    this.logger.log(
      'Fetching paginated manufacturing addresses',
      { page, limit },
      'ManufacturingAddressModule',
    );

    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      this.manufacturingAddressModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.manufacturingAddressModel.countDocuments().exec(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      items,
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a single manufacturing address by ID
   */
  async findOne(id: string): Promise<ManufacturingAddressDocument> {
    this.logger.log(
      'Fetching manufacturing address',
      { id },
      'ManufacturingAddressModule',
    );

    const address = await this.manufacturingAddressModel.findById(id).exec();

    if (!address) {
      throw new NotFoundException(
        `Manufacturing address with ID '${id}' not found`,
      );
    }

    return address;
  }

  /**
   * Get a manufacturing address by batch code
   */
  async findByBatchCode(
    batchCode: string,
  ): Promise<ManufacturingAddressDocument> {
    this.logger.log(
      'Fetching manufacturing address by batch code',
      { batchCode },
      'ManufacturingAddressModule',
    );

    const address = await this.manufacturingAddressModel
      .findOne({ batchCode })
      .exec();

    if (!address) {
      throw new NotFoundException(
        `Manufacturing address with batch code '${batchCode}' not found`,
      );
    }

    return address;
  }

  /**
   * Get all active manufacturing addresses
   */
  async findAllActive(): Promise<ManufacturingAddressDocument[]> {
    this.logger.log(
      'Fetching all active manufacturing addresses',
      {},
      'ManufacturingAddressModule',
    );

    return this.manufacturingAddressModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Update a manufacturing address
   */
  async update(
    id: string,
    input: UpdateManufacturingAddressInput,
  ): Promise<ManufacturingAddressDocument> {
    this.logger.log(
      'Updating manufacturing address',
      { id, input },
      'ManufacturingAddressModule',
    );

    // Check if the address exists
    const existingAddress = await this.findOne(id);

    // If batchCode is being updated, check for uniqueness
    if (input.batchCode && input.batchCode !== existingAddress.batchCode) {
      const duplicateAddress = await this.manufacturingAddressModel
        .findOne({ batchCode: input.batchCode })
        .exec();

      if (duplicateAddress) {
        throw new ConflictException(
          `Manufacturing address with batch code '${input.batchCode}' already exists`,
        );
      }
    }

    Object.assign(existingAddress, input);
    return existingAddress.save();
  }

  /**
   * Delete a manufacturing address
   */
  async delete(id: string): Promise<ManufacturingAddressDocument> {
    this.logger.log(
      'Deleting manufacturing address',
      { id },
      'ManufacturingAddressModule',
    );

    const address = await this.manufacturingAddressModel
      .findByIdAndDelete(id)
      .exec();

    if (!address) {
      throw new NotFoundException(
        `Manufacturing address with ID '${id}' not found`,
      );
    }

    return address;
  }

  /**
   * Toggle active status of a manufacturing address
   */
  async toggleActive(id: string): Promise<ManufacturingAddressDocument> {
    this.logger.log(
      'Toggling manufacturing address active status',
      { id },
      'ManufacturingAddressModule',
    );

    const address = await this.findOne(id);
    address.isActive = !address.isActive;
    return address.save();
  }
}
