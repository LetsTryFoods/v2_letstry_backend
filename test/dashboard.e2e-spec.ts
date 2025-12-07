import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';

import { FirebaseService } from '../src/firebase/firebase.service';
import { mockFirebaseService } from './common/firebase.mock';

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let authToken: string;
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

    const loginResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            adminLogin(email: "admin@example.com", password: "password")
          }
        `,
      });
    authToken = loginResponse.body.data.adminLogin;

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
    await connection.collection('products').deleteMany({});
    await connection.collection('categories').deleteMany({});
    await connection.collection('banners').deleteMany({});
  });

  it('should get dashboard stats', async () => {
    await connection.collection('categories').insertOne({
      name: 'Test Category',
      slug: 'test-category',
      codeValue: 'test',
      inCodeSet: 'https://schema.org/CategoryCode',
      productCount: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await connection.collection('products').insertMany([
      {
        name: 'Product 1',
        slug: 'product-1',
        description: 'Test product 1',
        categoryId: 'test-category-id',
        brand: 'Brand',
        sku: 'PROD001',
        images: [{ url: 'https://example.com/img.jpg', alt: 'Img' }],
        thumbnailUrl: 'https://example.com/thumb.jpg',
        price: 50,
        mrp: 60,
        discountPercent: 16.67,
        currency: 'INR',
        length: 5,
        height: 5,
        breadth: 5,
        weight: 100,
        weightUnit: 'g',
        packageSize: '100g',
        ingredients: 'Test',
        shelfLife: '6 months',
        isVegetarian: true,
        isGlutenFree: false,
        availabilityStatus: 'in_stock',
        stockQuantity: 10,
        ratingCount: 0,
        keywords: ['test'],
        tags: ['test'],
        discountSource: 'product',
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Product 2',
        slug: 'product-2',
        description: 'Test product 2',
        categoryId: 'test-category-id',
        brand: 'Brand',
        sku: 'PROD002',
        images: [{ url: 'https://example.com/img.jpg', alt: 'Img' }],
        thumbnailUrl: 'https://example.com/thumb.jpg',
        price: 50,
        mrp: 60,
        discountPercent: 16.67,
        currency: 'INR',
        length: 5,
        height: 5,
        breadth: 5,
        weight: 100,
        weightUnit: 'g',
        packageSize: '100g',
        ingredients: 'Test',
        shelfLife: '6 months',
        isVegetarian: true,
        isGlutenFree: false,
        availabilityStatus: 'out_of_stock',
        stockQuantity: 0,
        ratingCount: 0,
        keywords: ['test'],
        tags: ['test'],
        discountSource: 'product',
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Archived Product',
        slug: 'archived-product',
        description: 'Archived product',
        categoryId: 'test-category-id',
        brand: 'Brand',
        sku: 'ARCH001',
        images: [{ url: 'https://example.com/img.jpg', alt: 'Img' }],
        thumbnailUrl: 'https://example.com/thumb.jpg',
        price: 50,
        mrp: 60,
        discountPercent: 16.67,
        currency: 'INR',
        length: 5,
        height: 5,
        breadth: 5,
        weight: 100,
        weightUnit: 'g',
        packageSize: '100g',
        ingredients: 'Test',
        shelfLife: '6 months',
        isVegetarian: true,
        isGlutenFree: false,
        availabilityStatus: 'in_stock',
        stockQuantity: 5,
        ratingCount: 0,
        keywords: ['test'],
        tags: ['test'],
        discountSource: 'product',
        isArchived: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await connection.collection('banners').insertOne({
      title: 'Test Banner',
      description: 'Test banner description',
      imageUrl: 'https://example.com/banner.jpg',
      linkUrl: 'https://example.com',
      isActive: true,
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        query: `
          query {
            dashboardStats {
              totalProducts
              archivedProducts
              inStockProducts
              outOfStockProducts
              totalCategories
              activeBanners
              totalAdmins
            }
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        const stats = res.body.data.dashboardStats;
        expect(stats.totalProducts).toBe(2); // Only non-archived products
        expect(stats.archivedProducts).toBe(1);
        expect(stats.inStockProducts).toBe(1);
        expect(stats.outOfStockProducts).toBe(1);
        expect(stats.totalCategories).toBe(1);
        expect(stats.activeBanners).toBe(1);
        expect(stats.totalAdmins).toBe(1);
      });
  });

  it('should FORBID USER from accessing dashboard stats', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        query: `
          query {
            dashboardStats {
              totalProducts
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
