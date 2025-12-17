import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FirebaseService } from '../../firebase/firebase.service';
import { UserService } from '../../user/user.service';
import { FirebaseAuthService } from '../../identity/firebase-auth.service';
import { CreateUserInput } from './user-auth.input';
import { Role } from '../../common/enums/role.enum';
import { User } from '../../user/user.schema';
import { CartService } from '../../cart/cart.service';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { OtpService } from './otp.service';
import { Identity, IdentityDocument, IdentityStatus } from '../../common/schemas/identity.schema';
import { AddressService } from '../../address/address.service';

@Injectable()
export class UserAuthService {
  constructor(
    private firebaseService: FirebaseService,
    private userService: UserService,
    private firebaseAuthService: FirebaseAuthService,
    private jwtService: JwtService,
    private cartService: CartService,
    private whatsAppService: WhatsAppService,
    private otpService: OtpService,
    private addressService: AddressService,
    @InjectModel(Identity.name) private identityModel: Model<IdentityDocument>,
  ) {}

  async sendOtp(phoneNumber: string): Promise<string> {
    const otp = await this.otpService.createOtp(phoneNumber);
    
    const whatsAppSent = await this.whatsAppService.sendOtpTemplate(phoneNumber, otp);
    
    if (whatsAppSent) {
      return 'OTP sent via WhatsApp';
    }
    
    return 'WhatsApp not available, please use Firebase authentication';
  }

  async verifyWhatsAppOtp(phoneNumber: string, otp: string, input?: CreateUserInput, sessionId?: string): Promise<string> {
    await this.validateOtp(phoneNumber, otp);

    const allIdentitiesWithPhone = await this.findAllIdentitiesByPhone(phoneNumber);
    const { registered, guests } = this.categorizeIdentities(allIdentitiesWithPhone);

    if (registered) {
      await this.updateLoginTimestamp(registered._id.toString());
      await this.mergeAllGuestsIntoRegistered(registered._id.toString(), guests, sessionId);
      return this.generateSimpleAuthToken(this.mapIdentityToUser(registered));
    }

    const primaryGuest = await this.selectPrimaryGuest(sessionId, guests);
    
    if (primaryGuest) {
      const otherGuests = guests.filter(g => g._id.toString() !== primaryGuest._id.toString());
      await this.mergeAllGuestsIntoTarget(primaryGuest._id.toString(), otherGuests);
      return this.upgradeGuestToUser(primaryGuest, phoneNumber, input);
    }

    return this.createNewUser(phoneNumber, input);
  }

  async verifyOtpAndLogin(idToken: string, input?: CreateUserInput, sessionId?: string): Promise<string> {
    try {
      const { firebaseUid, phoneNumber } = await this.decodeAndValidateToken(idToken);
      
      const allIdentitiesWithPhone = await this.findAllIdentitiesByPhone(phoneNumber);
      const { registered, guests } = this.categorizeIdentities(allIdentitiesWithPhone);

      if (registered) {
        await this.updateLoginTimestamp(registered._id.toString());
        await this.mergeAllGuestsIntoRegistered(registered._id.toString(), guests, sessionId);
        const registeredUser = this.mapIdentityToUser(registered);
        return this.generateAuthToken(registeredUser, firebaseUid);
      }

      const primaryGuest = await this.selectPrimaryGuest(sessionId, guests);
      
      if (primaryGuest) {
        const otherGuests = guests.filter(g => g._id.toString() !== primaryGuest._id.toString());
        await this.mergeAllGuestsIntoTarget(primaryGuest._id.toString(), otherGuests);
        const upgradedUser = await this.upgradeGuestToUserWithFirebase(primaryGuest, phoneNumber, firebaseUid, input);
        return this.generateAuthToken(upgradedUser, firebaseUid);
      }

      const user = await this.resolveUser(firebaseUid, phoneNumber, input);
      return this.generateAuthToken(user, firebaseUid);
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  private async decodeAndValidateToken(idToken: string): Promise<{ firebaseUid: string; phoneNumber: string }> {
    const decodedToken = await this.firebaseService.verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      throw new Error('Phone number is missing in the token');
    }

    return { firebaseUid, phoneNumber };
  }

  private async resolveUser(firebaseUid: string, phoneNumber: string, input?: CreateUserInput): Promise<User> {
    let firebaseAuth = await this.firebaseAuthService.findByFirebaseUid(firebaseUid);

    if (firebaseAuth) {
      const user = await this.userService.findById(firebaseAuth.userId);
      if (!user) {
        throw new Error('User record not found.');
      }
      return user;
    }
    let user = await this.userService.findByPhoneNumber(phoneNumber);

    if (!user) {
      if (!input) {
        throw new Error('User not found. Please provide user details to sign up.');
      }
      if (input.firebaseUid !== firebaseUid) {
        throw new Error('Firebase UID mismatch');
      }
      const { firebaseUid: _, ...userData } = input;
      user = await this.userService.createUser({ ...userData, role: Role.USER });
    }

    await this.firebaseAuthService.createFirebaseAuth(user._id.toString(), firebaseUid);
    return user;
  }

  private generateAuthToken(user: User, firebaseUid: string): string {
    const payload = {
      sub: user._id,
      firebaseUid: firebaseUid,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  async validateJwtPayload(payload: any) {
    if (payload.firebaseUid) {
      try {
        await this.firebaseService.getUser(payload.firebaseUid);
      } catch (error) {
        return null;
      }
    }
    const user = await this.userService.findById(payload.sub);
    if (!user || !user.isPhoneVerified) {
      return null;
    }
    
    await this.updateUserLastActive(payload.sub);
    
    return { ...user, role: Role.USER };
  }

  private async updateUserLastActive(userId: string): Promise<void> {
    await this.identityModel.updateOne(
      { _id: userId },
      { lastActiveAt: new Date() }
    ).exec();
  }

  private async updateLoginTimestamp(userId: string): Promise<void> {
    await this.identityModel.updateOne(
      { _id: userId },
      { 
        lastLoginAt: new Date(),
        lastActiveAt: new Date()
      }
    ).exec();
  }

  private async validateOtp(phoneNumber: string, otp: string): Promise<void> {
    const isValid = await this.otpService.verifyOtp(phoneNumber, otp);
    if (!isValid) {
      throw new Error('Invalid or expired OTP');
    }
  }

  private async findGuestBySession(sessionId: string): Promise<IdentityDocument | null> {
    return this.identityModel.findOne({
      currentSessionId: sessionId,
      status: IdentityStatus.GUEST
    }).exec();
  }

  private async handleExistingUserLogin(existingUser: User, sessionId?: string): Promise<string> {
    if (sessionId) {
      const guestIdentity = await this.findGuestBySession(sessionId);
      if (guestIdentity) {
        await this.mergeGuestIntoExistingUser(guestIdentity, existingUser._id);
      }
    }

    return this.generateSimpleAuthToken(existingUser);
  }

  private async mergeGuestIntoExistingUser(guestIdentity: IdentityDocument, userId: string): Promise<void> {
    await this.mergeSingleIdentity(guestIdentity, userId);
  }

  private async upgradeGuestToUser(guestIdentity: IdentityDocument, phoneNumber: string, input?: CreateUserInput): Promise<string> {
    const updateData: any = {
      phoneNumber,
      status: IdentityStatus.REGISTERED,
      role: Role.USER,
      isPhoneVerified: true,
      registeredAt: new Date(),
    };

    if (input) {
      const { firebaseUid, ...userData } = input;
      Object.assign(updateData, userData);
    }
    
    await this.identityModel.updateOne(
      { _id: guestIdentity._id },
      updateData
    ).exec();

    const updatedIdentity = await this.identityModel.findById(guestIdentity._id).exec();
    if (!updatedIdentity) {
      throw new Error('Failed to upgrade guest to user');
    }
    
    return this.generateSimpleAuthToken(this.mapIdentityToUser(updatedIdentity));
  }

  private async createNewUser(phoneNumber: string, input?: CreateUserInput): Promise<string> {
    const userData: any = { phoneNumber, role: Role.USER };
    
    if (input) {
      const { firebaseUid, ...additionalData } = input;
      Object.assign(userData, additionalData);
    }
    
    const user = await this.userService.createUser(userData);

    return this.generateSimpleAuthToken(user);
  }

  private generateSimpleAuthToken(user: User): string {
    const payload = {
      sub: user._id,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private async findAllIdentitiesByPhone(phoneNumber: string): Promise<IdentityDocument[]> {
    return this.identityModel.find({
      phoneNumber,
      status: { $in: [IdentityStatus.GUEST, IdentityStatus.REGISTERED, IdentityStatus.VERIFIED, IdentityStatus.ACTIVE] }
    }).exec();
  }

  private categorizeIdentities(identities: IdentityDocument[]): { registered: IdentityDocument | null; guests: IdentityDocument[] } {
    const registered = identities.find(
      identity => [IdentityStatus.REGISTERED, IdentityStatus.VERIFIED, IdentityStatus.ACTIVE].includes(identity.status)
    ) || null;

    const guests = identities.filter(identity => identity.status === IdentityStatus.GUEST);

    return { registered, guests };
  }

  private async mergeAllGuestsIntoRegistered(targetIdentityId: string, guests: IdentityDocument[], sessionId?: string): Promise<void> {
    const guestsToMerge = [...guests];

    if (sessionId) {
      const currentSessionGuest = await this.findGuestBySession(sessionId);
      if (currentSessionGuest && !guests.some(g => g._id.toString() === currentSessionGuest._id.toString())) {
        guestsToMerge.push(currentSessionGuest);
      }
    }

    await this.mergeIdentitiesIntoTarget(targetIdentityId, guestsToMerge);
  }

  private async selectPrimaryGuest(sessionId: string | undefined, guests: IdentityDocument[]): Promise<IdentityDocument | null> {
    if (sessionId) {
      const currentSessionGuest = await this.findGuestBySession(sessionId);
      if (currentSessionGuest) {
        return currentSessionGuest;
      }
    }

    return guests.length > 0 ? guests[0] : null;
  }

  private async mergeAllGuestsIntoTarget(targetIdentityId: string, guests: IdentityDocument[]): Promise<void> {
    await this.mergeIdentitiesIntoTarget(targetIdentityId, guests);
  }

  private async mergeIdentitiesIntoTarget(targetIdentityId: string, sourceIdentities: IdentityDocument[]): Promise<void> {
    for (const sourceIdentity of sourceIdentities) {
      await this.mergeSingleIdentity(sourceIdentity, targetIdentityId);
    }
  }

  private async mergeSingleIdentity(sourceIdentity: IdentityDocument, targetIdentityId: string): Promise<void> {
    await this.cartService.mergeCarts(sourceIdentity._id.toString(), targetIdentityId);
    
    await this.addressService.transferAddresses(sourceIdentity._id.toString(), targetIdentityId);
    
    await this.identityModel.updateOne(
      { _id: targetIdentityId },
      { 
        $addToSet: { 
          sessionIds: sourceIdentity.currentSessionId,
          mergedGuestIds: sourceIdentity.identityId 
        }
      }
    ).exec();
    
    await this.identityModel.deleteOne({ _id: sourceIdentity._id }).exec();
  }

  private mapIdentityToUser(identity: IdentityDocument): User {
    return {
      _id: identity._id.toString(),
      phoneNumber: identity.phoneNumber || '',
      firstName: identity.firstName || '',
      lastName: identity.lastName || '',
      email: identity.email,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
      lastLoginAt: identity.lastLoginAt,
      lifetimeValue: identity.lifetimeValue,
      marketingSmsOptIn: identity.marketingSmsOptIn,
      signupSource: identity.signupSource,
      lastIp: identity.lastIp || '',
      role: identity.role as Role,
      isPhoneVerified: identity.isPhoneVerified,
      mergedGuestIds: identity.mergedGuestIds,
    };
  }

  private async upgradeGuestToUserWithFirebase(
    guestIdentity: IdentityDocument, 
    phoneNumber: string, 
    firebaseUid: string,
    input?: CreateUserInput
  ): Promise<User> {
    const updateData: any = {
      phoneNumber,
      status: IdentityStatus.REGISTERED,
      role: Role.USER,
      isPhoneVerified: true,
      registeredAt: new Date(),
    };

    if (input) {
      const { firebaseUid: _, ...userData } = input;
      Object.assign(updateData, userData);
    }

    await this.identityModel.updateOne(
      { _id: guestIdentity._id },
      updateData
    ).exec();

    const updatedIdentity = await this.identityModel.findById(guestIdentity._id).exec();
    if (!updatedIdentity) {
      throw new Error('Failed to upgrade guest to user');
    }

    await this.firebaseAuthService.createFirebaseAuth(updatedIdentity._id.toString(), firebaseUid);

    return this.mapIdentityToUser(updatedIdentity);
  }

}