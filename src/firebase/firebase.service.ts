import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    if (!admin.apps.length) {
      const firebaseConfig = this.configService.get('firebase');
      
      if (!firebaseConfig || !firebaseConfig.projectId) {
        console.warn('Firebase configuration missing or incomplete. Firebase Admin SDK not initialized.');
        return;
      }

      const serviceAccount = {
        type: 'service_account',
        project_id: firebaseConfig.projectId,
        private_key_id: firebaseConfig.privateKeyId,
        private_key: firebaseConfig.privateKey?.replace(/\\n/g, '\n'),
        client_email: firebaseConfig.clientEmail,
        client_id: firebaseConfig.clientId,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: firebaseConfig.clientX509CertUrl,
        universe_domain: 'googleapis.com',
      };

      try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
      } catch (error) {
        console.error('Failed to initialize Firebase Admin SDK:', error);
      }
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    return await admin.auth().verifyIdToken(idToken);
  }

  async getUser(uid: string): Promise<admin.auth.UserRecord> {
    return await admin.auth().getUser(uid);
  }
}