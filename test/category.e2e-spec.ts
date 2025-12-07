import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../src/firebase/firebase.service';
import { mockFirebaseService } from './common/firebase.mock';

describe('Category (e2e)', () => {
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

    try {
      await connection.collection('categories').dropIndex('id_1');
    } catch (error) {
      // Ignore error if index doesn't exist
    }
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    await connection.collection('categories').deleteMany({});
  });

  describe('Category Queries (Public)', () => {
    it('should get empty categories list', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              categories {
                items {
                  id
                  name
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.categories.items).toEqual([]);
        });
    });

    it('should get root categories', async () => {
       await connection.collection('categories').insertOne({
         name: 'Root',
         slug: 'root',
         codeValue: 'root',
         inCodeSet: 'test',
         parentId: null,
         isArchived: false,
         createdAt: new Date(),
         updatedAt: new Date()
       });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              rootCategories {
                items {
                  id
                  name
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.rootCategories.items).toHaveLength(1);
          expect(res.body.data.rootCategories.items[0].name).toBe('Root');
        });
    });

    it('should get category children', async () => {
       const parent = await connection.collection('categories').insertOne({
         name: 'Parent',
         slug: 'parent',
         codeValue: 'parent',
         inCodeSet: 'test',
         isArchived: false,
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const parentId = parent.insertedId.toString();

       await connection.collection('categories').insertOne({
         name: 'Child Category',
         slug: 'child',
         codeValue: 'child',
         inCodeSet: 'test',
         parentId: parentId,
         isArchived: false,
         createdAt: new Date(),
         updatedAt: new Date()
       });

        // Test getting children
      const childrenResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              categoryChildren(parentId: "${parentId}") {
                items {
                  id
                  name
                  parentId
                }
              }
            }
          `,
        });

      expect(childrenResponse.body.data.categoryChildren.items).toHaveLength(1);
      expect(childrenResponse.body.data.categoryChildren.items[0].name).toBe(
        'Child Category',
      );
      expect(childrenResponse.body.data.categoryChildren.items[0].parentId).toBe(
        parentId,
      );
    });

    it('should return null for non-existent category', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              category(id: "656e9b5a9d8f9b001f9b0000") {
                id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.category).toBeNull();
        });
    });
  });

  describe('Category Mutations (Admin Only)', () => {
    it('should allow ADMIN to create a category', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Test Category"
                slug: "test-category"
                description: "Test Description"
                codeValue: "test-category"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createCategory.name).toBe('Test Category');
        });
    });

    it('should allow ADMIN to update a category', async () => {
       const category = await connection.collection('categories').insertOne({
         name: 'Original',
         slug: 'original',
         codeValue: 'original',
         inCodeSet: 'test',
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const categoryId = category.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              updateCategory(id: "${categoryId}", input: {
                name: "Updated Name"
              }) {
                id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.updateCategory.name).toBe('Updated Name');
        });
    });

    it('should allow ADMIN to archive a category', async () => {
       const category = await connection.collection('categories').insertOne({
         name: 'To Archive',
         slug: 'to-archive',
         codeValue: 'archive',
         inCodeSet: 'test',
         isArchived: false,
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const categoryId = category.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              archiveCategory(id: "${categoryId}") {
                id
                isArchived
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.archiveCategory.isArchived).toBe(true);
        });
    });

    it('should allow ADMIN to unarchive a category', async () => {
       const category = await connection.collection('categories').insertOne({
         name: 'To Unarchive',
         slug: 'to-unarchive',
         codeValue: 'unarchive',
         inCodeSet: 'test',
         isArchived: true,
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const categoryId = category.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              unarchiveCategory(id: "${categoryId}") {
                id
                isArchived
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.unarchiveCategory.isArchived).toBe(false);
        });
    });
  });

  describe('Category Mutations (Forbidden for User)', () => {
    it('should FORBID USER from creating a category', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "User Category"
                slug: "user-category"
                codeValue: "user"
                inCodeSet: "test"
              }) {
                id
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

    it('should FORBID USER from updating a category', async () => {
       const category = await connection.collection('categories').insertOne({
         name: 'Test',
         slug: 'test',
         codeValue: 'test',
         inCodeSet: 'test',
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const categoryId = category.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              updateCategory(id: "${categoryId}", input: {
                name: "Hacked"
              }) {
                id
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

    it('should FORBID USER from archiving a category', async () => {
       const category = await connection.collection('categories').insertOne({
         name: 'Test',
         slug: 'test',
         codeValue: 'test',
         inCodeSet: 'test',
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const categoryId = category.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              archiveCategory(id: "${categoryId}") {
                id
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
