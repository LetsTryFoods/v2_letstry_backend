import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../src/firebase/firebase.service';
import { mockFirebaseService } from './common/firebase.mock';

describe('Banner (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminToken: string;
  let userToken: string;

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

    // 1. Setup Admin
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

    // 2. Setup User
    await connection.collection('users').deleteMany({});
    await connection.collection('firebaseauths').deleteMany({});
    
    const userSignupResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            verifyOtpAndLogin(
              idToken: "mock-firebase-token", 
              input: {
                phoneNumber: "+918851951492",
                firstName: "User",
                lastName: "Unknown",
                firebaseUid: "S3XyJV3kNZRue5MFxrLF5stbWrK2"
              }
            )
          }
        `,
      });
    userToken = userSignupResponse.body.data.verifyOtpAndLogin;
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    await connection.collection('banners').deleteMany({});
  });

  describe('Banner Queries (Public)', () => {
    it('should get empty banners list', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              banners {
                _id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.banners).toEqual([]);
        });
    });

    it('should get active banners', async () => {
       // Insert one active and one inactive banner
       await connection.collection('banners').insertMany([
         { name: 'Active Banner', isActive: true, createdAt: new Date(), updatedAt: new Date() },
         { name: 'Inactive Banner', isActive: false, createdAt: new Date(), updatedAt: new Date() }
       ]);

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              activeBanners {
                _id
                name
                isActive
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.activeBanners).toHaveLength(1);
          expect(res.body.data.activeBanners[0].name).toBe('Active Banner');
        });
    });

    it('should get banner by id', async () => {
       const banner = await connection.collection('banners').insertOne({
         name: 'Test Banner',
         isActive: true,
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const bannerId = banner.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              banner(id: "${bannerId}") {
                _id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.banner.name).toBe('Test Banner');
        });
    });

    it('should return null for non-existent banner id', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              banner(id: "656e9b5a9d8f9b001f9b0000") {
                _id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.banner).toBeNull();
        });
    });
  });

  describe('Banner Mutations (Admin Only)', () => {
    it('should allow ADMIN to create a banner', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              createBanner(input: {
                name: "Admin Banner"
                headline: "Headline"
                subheadline: "Subheadline"
                description: "Description"
                imageUrl: "https://example.com/image.jpg"
                mobileImageUrl: "https://example.com/mobile.jpg"
                url: "https://example.com"
                ctaText: "Click Here"
                position: 1
                isActive: true
              }) {
                _id
                name
                isActive
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createBanner.name).toBe('Admin Banner');
          expect(res.body.data.createBanner.isActive).toBe(true);
        });
    });

    it('should allow ADMIN to update a banner', async () => {
       const banner = await connection.collection('banners').insertOne({
         name: 'Old Name',
         isActive: true,
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const bannerId = banner.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              updateBanner(id: "${bannerId}", input: {
                name: "New Name"
              }) {
                _id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.updateBanner.name).toBe('New Name');
        });
    });

    it('should allow ADMIN to delete a banner', async () => {
       const banner = await connection.collection('banners').insertOne({
         name: 'To Delete',
         isActive: true,
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const bannerId = banner.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              deleteBanner(id: "${bannerId}") {
                _id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.deleteBanner.name).toBe('To Delete');
        });
    });

    it('should return error when updating non-existent banner', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              updateBanner(id: "656e9b5a9d8f9b001f9b0000", input: {
                name: "New Name"
              }) {
                _id
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.errors).toBeDefined();
        });
    });
  });

  describe('Banner Mutations (Forbidden for User)', () => {
    it('should FORBID USER from creating a banner', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              createBanner(input: {
                name: "User Banner"
                headline: "Headline"
                subheadline: "Subheadline"
                description: "Description"
                imageUrl: "https://example.com/image.jpg"
                mobileImageUrl: "https://example.com/mobile.jpg"
                url: "https://example.com"
                ctaText: "Click Here"
                position: 1
                isActive: true
              }) {
                _id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.errors).toBeDefined();
          expect(res.body.errors[0].message).toContain('Forbidden');
        });
    });

    it('should FORBID USER from updating a banner', async () => {
       const banner = await connection.collection('banners').insertOne({
         name: 'Test',
         isActive: true,
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const bannerId = banner.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              updateBanner(id: "${bannerId}", input: {
                name: "Hacked"
              }) {
                _id
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.errors).toBeDefined();
          expect(res.body.errors[0].message).toContain('Forbidden');
        });
    });

    it('should FORBID USER from deleting a banner', async () => {
       const banner = await connection.collection('banners').insertOne({
         name: 'Test',
         isActive: true,
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const bannerId = banner.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              deleteBanner(id: "${bannerId}") {
                _id
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.errors).toBeDefined();
          expect(res.body.errors[0].message).toContain('Forbidden');
        });
    });
  });
});
