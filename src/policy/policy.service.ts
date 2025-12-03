import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Policy, PolicyDocument } from './policy.schema';
import { CreatePolicyInput, UpdatePolicyInput } from './policy.input';
import { SlugUtils } from '../utils/slug.utils';

@Injectable()
export class PolicyService {
  constructor(
    @InjectModel(Policy.name) private policyModel: Model<PolicyDocument>,
  ) {}

  async create(createPolicyInput: CreatePolicyInput): Promise<Policy> {
    const input = { ...createPolicyInput, title: SlugUtils.generateSlug(createPolicyInput.title) };
    const createdPolicy = new this.policyModel(input);
    return createdPolicy.save();
  }

  async findAll(): Promise<Policy[]> {
    return this.policyModel.find().lean().exec() as unknown as Policy[];
  }

  async findByType(type: string): Promise<Policy[]> {
    return this.policyModel
      .find({ type })
      .lean()
      .exec() as unknown as Policy[];
  }

  async findOne(id: string): Promise<Policy> {
    const policy = (await this.policyModel
      .findById(id)
      .lean()
      .exec()) as unknown as Policy | null;
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }
    return policy;
  }

  async update(
    id: string,
    updatePolicyInput: UpdatePolicyInput,
  ): Promise<Policy> {
    const input = { ...updatePolicyInput };
    if (input.title) {
      input.title = SlugUtils.generateSlug(input.title);
    }
    const policy = (await this.policyModel
      .findByIdAndUpdate(id, input, { new: true })
      .lean()
      .exec()) as unknown as Policy | null;
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }
    return policy;
  }

  async remove(id: string): Promise<Policy> {
    const policy = (await this.policyModel
      .findByIdAndDelete(id)
      .lean()
      .exec()) as unknown as Policy | null;
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }
    return policy;
  }
}