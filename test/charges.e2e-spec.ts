import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../src/firebase/firebase.service';
import { mockFirebaseService } from './common/firebase.mock';

describe('Charges (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminToken: string;

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

    // Setup Admin
    await connection.collection('admins').deleteMany({});
    const hashedPassword = await bcrypt.hash('password', 10);
    await connection.collection('admins').insertOne({
      email: 'admin@example.com',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            adminLogin(email: "admin@example.com", password: "password")
          }
        `,
      });
    adminToken = adminLoginResponse.body.data.adminLogin;
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    await connection.collection('charges').deleteMany({});
  });

  describe('Charges Mutations (Admin)', () => {
    it('should create or update charges', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              createOrUpdateCharges(input: {
                active: true
                handlingCharge: 25
                gstPercentage: 18
                freeDeliveryThreshold: 499
                deliveryDelhiBelowThreshold: 40
                deliveryRestBelowThreshold: 60
              }) {
                active
                handlingCharge
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const charges = res.body.data.createOrUpdateCharges;
          expect(charges.active).toBe(true);
          expect(charges.handlingCharge).toBe(25);
        });
    });
  });

  describe('Charges Queries', () => {
    it('should get active charges', async () => {
      await connection.collection('charges').insertOne({
        active: true,
        handlingCharge: 15,
        gstPercentage: 18,
        freeDeliveryThreshold: 500,
        deliveryDelhiBelowThreshold: 40,
        deliveryRestBelowThreshold: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              charges {
                active
                handlingCharge
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.charges.handlingCharge).toBe(15);
        });
    });
  });
});
