import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../firebase/firebase.service';
import { UserService } from '../user/user.service';
import { FirebaseAuthService } from '../identity/firebase-auth.service';
import { CreateUserInput } from './user-auth.input';
import { Role } from '../common/enums/role.enum';
import { UserDocument } from '../user/user.schema';

@Injectable()
export class UserAuthService {
  constructor(
    private firebaseService: FirebaseService,
    private userService: UserService,
    private firebaseAuthService: FirebaseAuthService,
    private jwtService: JwtService,
  ) {}

  async sendOtp(phoneNumber: string): Promise<string> {
    return 'these api dont do anything {will be implement}';
  }

  async verifyOtpAndLogin(idToken: string, input?: CreateUserInput): Promise<string> {
    try {
      const { firebaseUid, phoneNumber } = await this.decodeAndValidateToken(idToken);
      const user = await this.resolveUser(firebaseUid, phoneNumber, input);
      await this.ensureUserVerified(user);
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

  private async resolveUser(firebaseUid: string, phoneNumber: string, input?: CreateUserInput): Promise<UserDocument> {
    let firebaseAuth = await this.firebaseAuthService.findByFirebaseUid(firebaseUid);

    if (firebaseAuth) {
      const user = await this.userService.findById(firebaseAuth.userId);
      if (!user) {
        throw new Error('User record not found.');
      }
      return user;
    }
    let user = await this.userService.findByPhoneNumber(phoneNumber);

    if (user) {
      user.isPhoneVerified = true;
      await user.save();
    } else {
      if (!input) {
        throw new Error('User not found. Please provide user details to sign up.');
      }
      if (input.firebaseUid !== firebaseUid) {
        throw new Error('Firebase UID mismatch');
      }
      const { firebaseUid: _, ...userData } = input;
      user = await this.userService.createUser({ ...userData, role: Role.USER });
      user.isPhoneVerified = true;
      await user.save();
    }

    await this.firebaseAuthService.createFirebaseAuth(user._id.toString(), firebaseUid);
    return user;
  }

  private async ensureUserVerified(user: UserDocument): Promise<void> {
    if (!user.isPhoneVerified) {
      user.isPhoneVerified = true;
      await user.save();
    }
  }

  private generateAuthToken(user: UserDocument, firebaseUid: string): string {
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
    const userObj = user.toObject();
    return { ...userObj, role: Role.USER };
  }


}