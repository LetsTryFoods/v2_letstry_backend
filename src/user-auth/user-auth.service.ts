import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../firebase/firebase.service';
import { UserService } from '../user/user.service';
import { FirebaseAuthService } from '../identity/firebase-auth.service';
import { CreateUserInput } from './user-auth.input';
import { Role } from '../common/enums/role.enum';

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
      const decodedToken = await this.firebaseService.verifyIdToken(idToken);
      const firebaseUid = decodedToken.uid;

      let firebaseAuth = await this.firebaseAuthService.findByFirebaseUid(firebaseUid)
      if (!firebaseAuth) {
        if (input) {
          if (input.firebaseUid !== firebaseUid) {
             throw new Error('Firebase UID mismatch');
          }
          const { firebaseUid: _, ...userData } = input;
          const user = await this.userService.createUser({ ...userData, role: Role.USER });
          firebaseAuth = await this.firebaseAuthService.createFirebaseAuth(user._id.toString(), firebaseUid);
        } else {
          throw new Error('User not found. Please provide user details to sign up.');
        }
      }

      const user = await this.userService.findById(firebaseAuth.user_id);
      if (!user) {
        throw new Error('User record not found.');
      }

      const payload = { 
        sub: user._id, 
        firebaseUid: firebaseUid, 
        role: user.role 
      };
      
      return this.jwtService.sign(payload);
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
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
    if (!user) {
      return null;
    }
    const userObj = user.toObject();
    return { ...userObj, role: Role.USER };
  }


}