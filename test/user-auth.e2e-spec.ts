import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { FirebaseService } from '../src/firebase/firebase.service';

import { REAL_ID_TOKEN } from './__mocks__/constants';

describe('User Auth (e2e) - Real Firebase', () => {
  let app: INestApplication;
  let connection: Connection;

  let firebaseService: FirebaseService;
  let decodedUid: string;

  beforeAll(async () => {
    // NOTE: We are NOT mocking FirebaseService here. 
    // We want to use the REAL implementation to verify the token with Firebase.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    connection = moduleFixture.get<Connection>(getConnectionToken());
    firebaseService = moduleFixture.get<FirebaseService>(FirebaseService);
    await app.init();

    try {
      const decodedToken = await firebaseService.verifyIdToken(REAL_ID_TOKEN);
      decodedUid = decodedToken.uid;
      console.log(`Successfully decoded token for UID: ${decodedUid}`);
    } catch (error) {
      console.error('Failed to decode REAL_ID_TOKEN. Is it valid and fresh?', error.message);
    }
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    await connection.collection('users').deleteMany({});
    await connection.collection('firebaseauths').deleteMany({});
  });

  it('should verify OTP and signup a new user with a REAL token', async () => {
    if (!decodedUid) {
      console.warn('SKIPPING TEST: Token could not be decoded.');
      return;
    }

    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            verifyOtpAndLogin(
              idToken: "${REAL_ID_TOKEN}", 
              input: {
                phoneNumber: "+918851951492", 
                first_name: "Real",
                last_name: "Tester",
                firebaseUid: "${decodedUid}" 
              }
            )
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        if (res.body.errors) {
          console.error('GraphQL Errors:', JSON.stringify(res.body.errors, null, 2));
        }
        expect(res.body.data.verifyOtpAndLogin).toBeDefined();
      });
  });

  it('should login an existing user with a REAL token', async () => {
     if (!decodedUid) {
      return;
    }

    
    const user = await connection.collection('users').insertOne({
      phoneNumber: "+918851951492",
      first_name: "Real",
      last_name: "Tester",
      role: "user",
      created_at: new Date(),
      updated_at: new Date(),
      marketing_sms_opt_in: false
    });

    await connection.collection('firebaseauths').insertOne({
      user_id: user.insertedId,
      firebase_uid: decodedUid,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            verifyOtpAndLogin(
              idToken: "${REAL_ID_TOKEN}"
            )
          }
        `,
      })
      .expect(200)
      .expect((res) => {
         if (res.body.errors) {
           console.log('Login result:', JSON.stringify(res.body, null, 2));
         }
         expect(res.body.data.verifyOtpAndLogin).toBeDefined();
      });
  });

  it('should FAIL when using an invalid ID token', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            verifyOtpAndLogin(
              idToken: "invalid-token-string"
            )
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.errors).toBeDefined();
        // The error message comes from Firebase Admin SDK
        // It might vary slightly but usually contains "Decoding Firebase ID token failed" or similar
        // Or our service wraps it in "Authentication failed: ..."
        expect(res.body.errors[0].message).toContain('Authentication failed');
      });
  });

  it('should FAIL login when user does not exist (and no input provided)', async () => {
    if (!decodedUid) return;

    // Ensure DB is empty (it is cleared in beforeEach, so we are good)
    
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            verifyOtpAndLogin(
              idToken: "${REAL_ID_TOKEN}"
            )
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('User not found');
      });
  });

  it('should FAIL signup when Firebase UID in input does not match token UID', async () => {
    if (!decodedUid) return;

    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            verifyOtpAndLogin(
              idToken: "${REAL_ID_TOKEN}",
              input: {
                phoneNumber: "+918851951492", 
                first_name: "Hacker",
                last_name: "Try",
                firebaseUid: "mismatched-uid-123" 
              }
            )
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('Firebase UID mismatch');
      });
  });
});
