import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PolicyService } from './policy.service';
import { Policy } from './policy.graphql';
import { CreatePolicyInput, UpdatePolicyInput } from './policy.input';
import { Public } from '../admin/auth/public.decorator';

@Resolver(() => Policy)
export class PolicyResolver {
  constructor(private readonly policyService: PolicyService) {}

  @Query(() => [Policy], { name: 'policies' })
  @Public()
  async getPolicies(): Promise<Policy[]> {
    return this.policyService.findAll();
  }

  @Query(() => [Policy], { name: 'policiesByType' })
  @Public()
  async getPoliciesByType(
    @Args('type') type: string,
  ): Promise<Policy[]> {
    return this.policyService.findByType(type);
  }

  @Query(() => Policy, { name: 'policy', nullable: true })
  @Public()
  async getPolicy(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Policy | null> {
    try {
      return await this.policyService.findOne(id);
    } catch {
      return null;
    }
  }

  @Mutation(() => Policy, { name: 'createPolicy' })
  async createPolicy(@Args('input') input: CreatePolicyInput): Promise<Policy> {
    return this.policyService.create(input);
  }

  @Mutation(() => Policy, { name: 'updatePolicy' })
  async updatePolicy(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdatePolicyInput,
  ): Promise<Policy> {
    return this.policyService.update(id, input);
  }

  @Mutation(() => Policy, { name: 'deletePolicy' })
  async deletePolicy(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Policy> {
    return this.policyService.remove(id);
  }
}