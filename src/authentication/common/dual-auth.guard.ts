import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Identity, IdentityDocument, IdentityStatus } from '../../common/schemas/identity.schema';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class DualAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    @InjectModel(Identity.name) private identityModel: Model<IdentityDocument>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    try {
      const jwtResult = await super.canActivate(context);
      if (jwtResult && request.user) {
        return true;
      }
    } catch (err) {
    }

    let sessionId = request.cookies?.sessionId;
    
    if (!sessionId && request.cookies?.guest_session) {
      if (typeof request.cookies.guest_session === 'string') {
        try {
          const parsed = JSON.parse(request.cookies.guest_session);
          sessionId = parsed.sessionId;
        } catch (e) {
        }
      } else if (typeof request.cookies.guest_session === 'object') {
        sessionId = request.cookies.guest_session.sessionId;
      }
    }
    
    if (!sessionId) {
      return true;
    }

    const identity = await this.identityModel.findOne({ 
      currentSessionId: sessionId,
      status: IdentityStatus.GUEST 
    }).exec();
    
    if (identity) {
      request.guest = {
        _id: identity._id.toString(),
        guestId: identity.identityId,
        sessionId: identity.currentSessionId,
        createdAt: identity.createdAt,
        lastActiveAt: identity.lastActiveAt || identity.updatedAt,
        ipAddress: identity.ipAddress,
        deviceInfo: identity.deviceInfo,
      };
      request.user = { 
        _id: identity._id.toString(), 
        role: Role.GUEST,
        sessionId: identity.currentSessionId,
        guestId: identity.identityId,
        isGuest: true,
      };
      return true;
    }

    return true;
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
