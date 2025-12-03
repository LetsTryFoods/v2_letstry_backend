import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';

describe('Category (e2e)', () => {
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

    authToken = loginResponse.body.data.adminLogin;

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
    // Clear categories collection
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
                id
                name
                slug
                productCount
                isArchived
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.categories).toEqual([]);
        });
    });

    it('should get root categories', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              rootCategories {
                id
                name
                parentId
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.rootCategories).toEqual([]);
        });
    });

    it('should get category children', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              categoryChildren(parentId: "some-parent-id") {
                id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.categoryChildren).toEqual([]);
        });
    });

    it('should return null for non-existent category', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              category(id: "non-existent-id") {
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

    it('should get category by slug', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              categoryBySlug(slug: "non-existent-slug") {
                id
                name
                slug
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.categoryBySlug).toBeNull();
        });
    });
  });

  describe('Category Mutations (Protected)', () => {
    it('should create a category', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
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
                slug
                description
                codeValue
                inCodeSet
                productCount
                isArchived
                createdAt
                updatedAt
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const category = res.body.data.createCategory;
          expect(category.name).toBe('Test Category');
          expect(category.slug).toBe('test-category');
          expect(category.description).toBe('Test Description');
          expect(category.codeValue).toBe('test-category');
          expect(category.inCodeSet).toBe('https://schema.org/CategoryCode');
          expect(category.productCount).toBe(0);
          expect(category.isArchived).toBe(false);
          expect(category.id).toBeDefined();
          expect(category.createdAt).toBeDefined();
          expect(category.updatedAt).toBeDefined();
        });
    });

    it('should update a category', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Original Name"
                slug: "original-slug"
                codeValue: "original"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
              }
            }
          `,
        });

      const categoryId = createResponse.body.data.createCategory.id;

      // Then update it
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              updateCategory(id: "${categoryId}", input: {
                name: "Updated Name"
                description: "Updated Description"
              }) {
                id
                name
                description
                slug
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const category = res.body.data.updateCategory;
          expect(category.name).toBe('Updated Name');
          expect(category.description).toBe('Updated Description');
          expect(category.slug).toBe('original-slug');
        });
    });

    it('should fail to create category with duplicate slug', async () => {
      // First create a category
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Unique Category"
                slug: "unique-category-slug"
                codeValue: "unique"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
              }
            }
          `,
        });

      // Try to create another category with the same slug
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Another Category"
                slug: "unique-category-slug"
                codeValue: "another"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.errors).toBeDefined();
          expect(res.body.errors[0].message).toContain(
            "Category with slug 'unique-category-slug' already exists",
          );
        });
    });

    it('should fail to update category with duplicate slug', async () => {
      // Create first category
      const category1Response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Category One"
                slug: "category-one"
                codeValue: "cat1"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
              }
            }
          `,
        });

      // Create second category
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Category Two"
                slug: "category-two"
                codeValue: "cat2"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
              }
            }
          `,
        });

      const category1Id = category1Response.body.data.createCategory.id;

      // Try to update first category with second category's slug
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              updateCategory(id: "${category1Id}", input: {
                slug: "category-two"
              }) {
                id
                slug
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.errors).toBeDefined();
          expect(res.body.errors[0].message).toContain(
            "Category with slug 'category-two' already exists",
          );
        });
    });

    it('should auto-generate unique slug from name for categories', async () => {
      // Create first category without slug
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Auto Generated Category"
                codeValue: "auto"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
                slug
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createCategory.slug).toBe(
            'auto-generated-category',
          );
        });

      // Create second category with same name - should get unique slug
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Auto Generated Category"
                codeValue: "auto2"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
                slug
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createCategory.slug).toBe(
            'auto-generated-category-1',
          );
        });
    });

    it('should archive a category', async () => {
      // First create a category
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Category to Archive"
                slug: "archive-test"
                codeValue: "archive"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
              }
            }
          `,
        });

      const categoryId = createResponse.body.data.createCategory.id;

      // Then archive it
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              archiveCategory(id: "${categoryId}") {
                id
                name
                isArchived
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const category = res.body.data.archiveCategory;
          expect(category.id).toBe(categoryId);
          expect(category.name).toBe('Category to Archive');
          expect(category.isArchived).toBe(true);
        });
    });

    it('should unarchive a category', async () => {
      // First create and archive a category
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Category to Unarchive"
                slug: "unarchive-test"
                codeValue: "unarchive"
                inCodeSet: "https://schema.org/CategoryCode"
                isArchived: true
              }) {
                id
              }
            }
          `,
        });

      const categoryId = createResponse.body.data.createCategory.id;

      // Then unarchive it
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              unarchiveCategory(id: "${categoryId}") {
                id
                name
                isArchived
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const category = res.body.data.unarchiveCategory;
          expect(category.id).toBe(categoryId);
          expect(category.name).toBe('Category to Unarchive');
          expect(category.isArchived).toBe(false);
        });
    });

    it('should return error for unauthorized access to mutations', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Unauthorized"
                slug: "unauthorized"
                codeValue: "unauth"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
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

  describe('Category Hierarchy', () => {
    it('should create parent and child categories', async () => {
      const parentResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Parent Category"
                slug: "parent-category"
                codeValue: "parent"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
                name
              }
            }
          `,
        });

      const parentId = parentResponse.body.data.createCategory.id;

      // Create child category
      const childResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "Child Category"
                slug: "child-category"
                parentId: "${parentId}"
                codeValue: "child"
                inCodeSet: "https://schema.org/CategoryCode"
              }) {
                id
                name
                parentId
              }
            }
          `,
        });

      expect(childResponse.body.data.createCategory.parentId).toBe(parentId);

      // Test getting children
      const childrenResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              categoryChildren(parentId: "${parentId}") {
                id
                name
                parentId
              }
            }
          `,
        });

      expect(childrenResponse.body.data.categoryChildren).toHaveLength(1);
      expect(childrenResponse.body.data.categoryChildren[0].name).toBe(
        'Child Category',
      );
      expect(childrenResponse.body.data.categoryChildren[0].parentId).toBe(
        parentId,
      );
    });
  });
});
