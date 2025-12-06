import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FirebaseAuth, FirebaseAuthDocument } from './firebase-auth.schema';

@Injectable()
export class FirebaseAuthService {
  constructor(@InjectModel(FirebaseAuth.name) private firebaseAuthModel: Model<FirebaseAuthDocument>) {}

  async createFirebaseAuth(userId: string, firebaseUid: string): Promise<FirebaseAuthDocument> {
    const firebaseAuth = new this.firebaseAuthModel({
      userId: userId,
      firebaseUid: firebaseUid,
    });
    return await firebaseAuth.save();
  }

  async findByFirebaseUid(firebaseUid: string): Promise<FirebaseAuthDocument | null> {
    return await this.firebaseAuthModel.findOne({ firebaseUid: firebaseUid });
  }
}