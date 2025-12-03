import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';

describe('Banner (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    connection = moduleFixture.get<Connection>(getConnectionToken());
    await app.init();

    // Create admin user for testing
    await connection.collection('admins').deleteMany({});
    const hashedPassword = await bcrypt.hash('password', 10);
    await connection.collection('admins').insertOne({
      email: 'admin@example.com',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            adminLogin(email: "admin@example.com", password: "password")
          }
        `,
      });

    console.log('Login response:', JSON.stringify(loginResponse.body, null, 2));

    if (loginResponse.body.errors) {
      throw new Error(
        `Login failed: ${JSON.stringify(loginResponse.body.errors)}`,
      );
    }

    authToken = loginResponse.body.data.adminLogin;
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    // Clear banners collection
    await connection.collection('banners').deleteMany({});
  });

  describe('Banner Queries', () => {
    it('should get empty banners list', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            query {
              banners {
                _id
                name
                description
                imageUrl
                isActive
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.banners).toEqual([]);
        });
    });

    it('should get active banners', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
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
          expect(res.body.data.activeBanners).toEqual([]);
        });
    });

    it('should return null for non-existent banner', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            query {
              banner(id: "non-existent-id") {
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

  describe('Banner Mutations', () => {
    it('should create a banner', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createBanner(input: {
                name: "Test Banner"
                headline: "Test Headline"
                subheadline: "Test Subheadline"
                description: "Test Description"
                imageUrl: "https://example.com/image.jpg"
                mobileImageUrl: "https://example.com/mobile.jpg"
                url: "https://example.com"
                ctaText: "Click Here"
                position: 1
                isActive: true
              }) {
                _id
                name
                description
                imageUrl
                isActive
                createdAt
                updatedAt
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const banner = res.body.data.createBanner;
          expect(banner.name).toBe('Test Banner');
          expect(banner.description).toBe('Test Description');
          expect(banner.imageUrl).toBe('https://example.com/image.jpg');
          expect(banner.isActive).toBe(true);
          expect(banner._id).toBeDefined();
          expect(banner.createdAt).toBeDefined();
          expect(banner.updatedAt).toBeDefined();
        });
    });

    it('should update a banner', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createBanner(input: {
                name: "Original Name"
                headline: "Original Headline"
                subheadline: "Original Subheadline"
                description: "Original Description"
                imageUrl: "https://example.com/original.jpg"
                mobileImageUrl: "https://example.com/mobile.jpg"
                url: "https://example.com"
                ctaText: "Click Here"
                position: 1
                isActive: true
              }) {
                _id
              }
            }
          `,
        });

      const bannerId = createResponse.body.data.createBanner._id;

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              updateBanner(id: "${bannerId}", input: {
                name: "Updated Name"
                description: "Updated Description"
              }) {
                _id
                name
                description
                imageUrl
                isActive
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const banner = res.body.data.updateBanner;
          expect(banner.name).toBe('Updated Name');
          expect(banner.description).toBe('Updated Description');
          expect(banner.imageUrl).toBe('https://example.com/original.jpg');
          expect(banner.isActive).toBe(true);
        });
    });

    it('should delete a banner', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createBanner(input: {
                name: "Banner to Delete"
                headline: "Delete Headline"
                subheadline: "Delete Subheadline"
                description: "Will be deleted"
                imageUrl: "https://example.com/delete.jpg"
                mobileImageUrl: "https://example.com/mobile.jpg"
                url: "https://example.com"
                ctaText: "Click"
                position: 1
                isActive: true
              }) {
                _id
              }
            }
          `,
        });

      const bannerId = createResponse.body.data.createBanner._id;

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
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
          const banner = res.body.data.deleteBanner;
          expect(banner._id).toBe(bannerId);
          expect(banner.name).toBe('Banner to Delete');
        });
    });

    it('should return error for unauthorized access to mutations', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createBanner(input: {
                name: "Unauthorized"
                headline: "Headline"
                subheadline: "Subheadline"
                imageUrl: "https://example.com/test.jpg"
                mobileImageUrl: "https://example.com/mobile.jpg"
                url: "https://example.com"
                ctaText: "Click"
                position: 1
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
          expect(res.body.errors[0].message).toContain('Unauthorized');
        });
    });
  });
});
