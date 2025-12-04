import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../src/firebase/firebase.service';

describe('Product (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminToken: string;
  let userToken: string;
  let categoryId: string;

  const mockFirebaseService = {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'S3XyJV3kNZRue5MFxrLF5stbWrK2' }),
    getUser: jest.fn().mockResolvedValue({ uid: 'S3XyJV3kNZRue5MFxrLF5stbWrK2' }),
  };

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
                first_name: "User",
                last_name: "Unknown",
                firebaseUid: "S3XyJV3kNZRue5MFxrLF5stbWrK2"
              }
            )
          }
        `,
      });
    userToken = userSignupResponse.body.data.verifyOtpAndLogin;

    // 3. Setup Category
    await connection.collection('categories').deleteMany({});
    try {
      await connection.collection('categories').dropIndex('id_1');
    } catch (error) {
      // Ignore error if index doesn't exist
    }
    const category = await connection.collection('categories').insertOne({
      name: 'Snacks',
      slug: 'snacks',
      codeValue: 'snacks',
      inCodeSet: 'https://schema.org/CategoryCode',
      productCount: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    categoryId = category.insertedId.toHexString();
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    await connection.collection('products').deleteMany({});
    try {
      await connection.collection('products').dropIndex('id_1');
    } catch (e) {}
  });

  describe('Product Queries (Public)', () => {
    it('should get empty products list', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              products {
                items {
                  _id
                  name
                  slug
                  price
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.products.items).toEqual([]);
        });
    });

    it('should get products with category field resolver', async () => {
      await connection.collection('products').insertOne({
        name: "Masala Sev",
        slug: "masala-sev",
        description: "Crispy masala sev",
        categoryId: categoryId,
        brand: "Local Brand",
        sku: "SKU001",
        images: [{ url: "https://example.com/sev.jpg", alt: "Masala Sev" }],
        thumbnailUrl: "https://example.com/sev-thumb.jpg",
        price: 50,
        mrp: 60,
        discountPercent: 16.67,
        currency: "INR",
        length: 10,
        height: 15,
        breadth: 5,
        weight: 200,
        weightUnit: "g",
        packageSize: "200g pack",
        ingredients: "Gram flour, spices",
        shelfLife: "6 months",
        isVegetarian: true,
        isGlutenFree: false,
        availabilityStatus: "in_stock",
        stockQuantity: 100,
        ratingCount: 0,
        keywords: ["sev", "snacks"],
        tags: ["bestseller"],
        discountSource: "product",
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              products {
                items {
                  _id
                  name
                  category {
                    id
                    name
                    slug
                  }
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.products.items).toHaveLength(1);
          expect(res.body.data.products.items[0].category).toBeDefined();
          expect(res.body.data.products.items[0].category.name).toBe('Snacks');
        });
    });

    it('should get product by id', async () => {
      const product = await connection.collection('products').insertOne({
        name: "Test Product",
        slug: "test-product",
        description: "Test description",
        categoryId: categoryId,
        price: 100,
        mrp: 120,
        isArchived: false,
        availabilityStatus: "in_stock",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const productId = product.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              product(id: "${productId}") {
                _id
                name
                slug
                price
                mrp
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.product).toBeDefined();
          expect(res.body.data.product.name).toBe('Test Product');
        });
    });

    it('should get product by slug', async () => {
      await connection.collection('products').insertOne({
        name: "Slug Test",
        slug: "slug-test",
        description: "Test",
        categoryId: categoryId,
        price: 75,
        mrp: 90,
        isArchived: false,
        availabilityStatus: "in_stock",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              productBySlug(slug: "slug-test") {
                _id
                name
                slug
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.productBySlug).toBeDefined();
          expect(res.body.data.productBySlug.slug).toBe('slug-test');
        });
    });

    it('should get products by category', async () => {
      await connection.collection('products').insertOne({
        name: "Category Product 1",
        slug: "category-product-1",
        description: "Test",
        categoryId: categoryId,
        price: 50,
        mrp: 60,
        isArchived: false,
        availabilityStatus: "in_stock",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              productsByCategory(categoryId: "${categoryId}") {
                items {
                  _id
                  name
                  categoryId
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.productsByCategory.items).toHaveLength(1);
          expect(res.body.data.productsByCategory.items[0].categoryId).toBe(
            categoryId,
          );
        });
    });

    it('should search products', async () => {
      await connection.collection('products').insertOne({
        name: "Spicy Masala Chips",
        slug: "spicy-masala-chips",
        description: "Hot and spicy chips",
        categoryId: categoryId,
        price: 30,
        mrp: 40,
        keywords: ["chips", "spicy", "masala"],
        isArchived: false,
        availabilityStatus: "in_stock",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              searchProducts(searchTerm: "masala") {
                items {
                  _id
                  name
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.searchProducts.items.length).toBeGreaterThan(0);
        });
    });

    it('should return null for non-existent product', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              product(id: "507f1f77bcf86cd799439011") {
                _id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.product).toBeNull();
        });
    });
  });

  describe('Product Mutations (Admin Only)', () => {
    it('should allow ADMIN to create a product', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Premium Namkeen"
                slug: "premium-namkeen"
                description: "Best quality namkeen"
                categoryId: "${categoryId}"
                brand: "Premium Brand"
                sku: "PREM001"
                gtin: "1234567890123"
                images: [
                  { url: "https://example.com/namkeen1.jpg", alt: "Front view" }
                  { url: "https://example.com/namkeen2.jpg", alt: "Back view" }
                ]
                thumbnailUrl: "https://example.com/namkeen-thumb.jpg"
                price: 80
                mrp: 100
                discountPercent: 20
                currency: "INR"
                length: 12
                height: 18
                breadth: 6
                weight: 250
                weightUnit: "g"
                packageSize: "250g family pack"
                ingredients: "Gram flour, salt, spices, oil"
                allergens: "May contain traces of nuts"
                shelfLife: "8 months"
                isVegetarian: true
                isGlutenFree: false
                availabilityStatus: "in_stock"
                stockQuantity: 150
                ratingCount: 0
                keywords: ["namkeen", "snacks", "premium"]
                tags: ["bestseller", "new"]
                discountSource: "product"
              }) {
                _id
                name
                slug
                price
                mrp
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const product = res.body.data.createProduct;
          expect(product.name).toBe('Premium Namkeen');
          expect(product.slug).toBe('premium-namkeen');
          expect(product.price).toBe(80);
          expect(product.mrp).toBe(100);
        });
    });

    it('should allow ADMIN to update a product', async () => {
      const product = await connection.collection('products').insertOne({
        name: "Original Name",
        slug: "original-slug",
        description: "Original",
        categoryId: categoryId,
        price: 50,
        mrp: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const productId = product.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              updateProduct(id: "${productId}", input: {
                name: "Updated Name"
                description: "Updated description"
                price: 70
                mrp: 85
              }) {
                _id
                name
                description
                price
                mrp
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const product = res.body.data.updateProduct;
          expect(product.name).toBe('Updated Name');
          expect(product.description).toBe('Updated description');
          expect(product.price).toBe(70);
          expect(product.mrp).toBe(85);
        });
    });

    it('should fail to create product with duplicate slug', async () => {
      // First create a product
      await connection.collection('products').insertOne({
        name: "Unique Product",
        slug: "unique-product-slug",
        description: "Test",
        categoryId: categoryId,
        price: 50,
        mrp: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Try to create another product with the same slug
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Another Product"
                slug: "unique-product-slug"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "ANOTH001"
                images: [{ url: "https://example.com/img.jpg", alt: "Img" }]
                thumbnailUrl: "https://example.com/thumb.jpg"
                price: 50
                mrp: 60
                discountPercent: 16.67
                currency: "INR"
                length: 5
                height: 5
                breadth: 5
                weight: 100
                weightUnit: "g"
                packageSize: "100g"
                ingredients: "Test"
                shelfLife: "6 months"
                isVegetarian: true
                isGlutenFree: false
                availabilityStatus: "in_stock"
                stockQuantity: 50
                ratingCount: 0
                keywords: ["test"]
                tags: ["test"]
                discountSource: "product"
              }) {
                _id
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.errors).toBeDefined();
          expect(res.body.errors[0].message).toContain(
            "Product with slug 'unique-product-slug' already exists",
          );
        });
    });
  });

  describe('Product Mutations (Forbidden for User)', () => {
    it('should FORBID USER from creating a product', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "User Product"
                slug: "user-product"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "USER001"
                images: [{ url: "https://example.com/img.jpg", alt: "Img" }]
                thumbnailUrl: "https://example.com/thumb.jpg"
                price: 50
                mrp: 60
                discountPercent: 16.67
                currency: "INR"
                length: 5
                height: 5
                breadth: 5
                weight: 100
                weightUnit: "g"
                packageSize: "100g"
                ingredients: "Test"
                shelfLife: "6 months"
                isVegetarian: true
                isGlutenFree: false
                availabilityStatus: "in_stock"
                stockQuantity: 50
                ratingCount: 0
                keywords: ["test"]
                tags: ["test"]
                discountSource: "product"
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

    it('should FORBID USER from updating a product', async () => {
      const product = await connection.collection('products').insertOne({
        name: "Test",
        slug: "test",
        categoryId: categoryId,
        price: 50,
        mrp: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const productId = product.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              updateProduct(id: "${productId}", input: {
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
  });
});
