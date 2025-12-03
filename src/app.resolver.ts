import { Query, Resolver } from '@nestjs/graphql';
import { Public } from './admin/auth/public.decorator';

@Resolver()
export class AppResolver {
  @Query(() => String)
  @Public()
  hello(): string {
    return 'Hello World!';
  }
}
