import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { FirebaseService } from '../src/firebase/firebase.service';
import { mockFirebaseService } from './common/firebase.mock';

describe('Guest (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseService)
      .useValue(mockFirebaseService)
      .compile();

    app = moduleFixture.createNestApplication();
    connection = moduleFixture.get<Connection>(getConnectionToken());
    await app.init();
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    await connection.collection('guests').deleteMany({});
  });

  describe('Guest Mutations', () => {
    it('should create a guest and set cookie', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createGuest(input: {
                ipAddress: "127.0.0.1"
              }) {
                guestId
                sessionId
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const guest = res.body.data.createGuest;
          expect(guest.guestId).toBeDefined();
          expect(guest.sessionId).toBeDefined();
          
          const cookies = res.headers['set-cookie'];
          expect(cookies).toBeDefined();
          expect(cookies[0]).toContain('guest_session');
        });
    });
  });

  describe('Guest Queries', () => {
    it('should get guest by guestId', async () => {
      // Create guest directly
      const guestId = "test-guest-id";
      const sessionId = "test-session-id";
      await connection.collection('guests').insertOne({
        guestId,
        sessionId,
        ipAddress: "127.0.0.1",
        createdAt: new Date(),
        lastActiveAt: new Date()
      });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              guestByGuestId(guestId: "${guestId}") {
                guestId
                ipAddress
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.guestByGuestId.guestId).toBe(guestId);
          expect(res.body.data.guestByGuestId.ipAddress).toBe("127.0.0.1");
        });
    });
  });
});
