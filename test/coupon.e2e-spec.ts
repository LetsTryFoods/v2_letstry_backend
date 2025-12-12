import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../src/firebase/firebase.service';
import { mockFirebaseService } from './common/firebase.mock';

describe('Coupon (e2e)', () => {
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
    await connection.collection('coupons').deleteMany({});
  });

  describe('Coupon Mutations (Admin)', () => {
    it('should create a coupon', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              createCoupon(input: {
                name: "Welcome Offer"
                description: "Get 10% off"
                code: "WELCOME10"
                discountType: PERCENTAGE
                discountValue: 10
                minCartValue: 500
                startDate: "${new Date().toISOString()}"
                endDate: "${new Date(Date.now() + 86400000).toISOString()}"
                isActive: true
                usageLimit: 100
              }) {
                _id
                code
                discountValue
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const coupon = res.body.data.createCoupon;
          expect(coupon.code).toBe('WELCOME10');
          expect(coupon.discountValue).toBe(10);
        });
    });
  });

  describe('Coupon Queries', () => {
    it('should get coupon by code', async () => {
      await connection.collection('coupons').insertOne({
        name: "Summer Sale",
        description: "Flat 50 off",
        code: "SUMMER50",
        discountType: "FIXED",
        discountValue: 50,
        minCartValue: 200,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              coupon(code: "SUMMER50") {
                _id
                code
                discountValue
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.coupon).not.toBeNull();
          expect(res.body.data.coupon.code).toBe('SUMMER50');
          expect(res.body.data.coupon.discountValue).toBe(50);
        });
    });
  });
});
