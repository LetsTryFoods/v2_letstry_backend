import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../src/firebase/firebase.service';

import { mockFirebaseService } from './common/firebase.mock';

describe('Product (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminToken: string;
  let userToken: string;
  let categoryId: string;

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
    if (userSignupResponse.body.errors) {
      console.error('Signup Errors:', JSON.stringify(userSignupResponse.body.errors, null, 2));
    }
    userToken = userSignupResponse.body.data.verifyOtpAndLogin;

    await connection.collection('categories').deleteMany({});
    try {
      await connection.collection('categories').dropIndex('id_1');
    } catch (error) {
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

  const createTestVariant = (overrides = {}) => ({
    sku: `SKU${Math.random().toString(36).substr(2, 9)}`,
    name: '200g',
    price: 50,
    mrp: 60,
    discountPercent: 16.67,
    discountSource: 'product',
    weight: 200,
    weightUnit: 'g',
    packageSize: '200g pack',
    length: 10,
    height: 15,
    breadth: 5,
    stockQuantity: 100,
    availabilityStatus: 'in_stock',
    images: [{ url: 'https://example.com/sev.jpg', alt: 'Masala Sev' }],
    thumbnailUrl: 'https://example.com/sev-thumb.jpg',
    isDefault: true,
    isActive: true,
    ...overrides,
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
        currency: "INR",
        ingredients: "Gram flour, spices",
        shelfLife: "6 months",
        isVegetarian: true,
        isGlutenFree: false,
        ratingCount: 0,
        keywords: ["sev", "snacks"],
        tags: ["bestseller"],
        variants: [createTestVariant()],
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              products(includeOutOfStock: true) {
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
        brand: "Test Brand",
        currency: "INR",
        ingredients: "Test ingredients",
        shelfLife: "6 months",
        isVegetarian: true,
        isGlutenFree: false,
        ratingCount: 0,
        keywords: [],
        tags: [],
        variants: [createTestVariant()],
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
                seo {
                  metaTitle
                  metaDescription
                  metaKeywords
                  canonicalUrl
                  ogTitle
                  ogDescription
                  ogImage
                }
                variants {
                  _id
                  price
                  mrp
                  sku
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.product).toBeDefined();
          expect(res.body.data.product.name).toBe('Test Product');
          expect(res.body.data.product.variants).toBeDefined();
          expect(res.body.data.product.variants.length).toBeGreaterThan(0);
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
        brand: "Test Brand",
        currency: "INR",
        ingredients: "Test ingredients",
        shelfLife: "6 months",
        isVegetarian: true,
        isGlutenFree: false,
        ratingCount: 0,
        keywords: [],
        tags: [],
        variants: [createTestVariant()],
        isArchived: false,
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
        brand: "Test Brand",
        currency: "INR",
        ingredients: "Test ingredients",
        shelfLife: "6 months",
        isVegetarian: true,
        isGlutenFree: false,
        ratingCount: 0,
        keywords: ["chips", "spicy", "masala"],
        tags: [],
        variants: [createTestVariant()],
        isArchived: false,
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
                gtin: "1234567890123"
                currency: "INR"
                ingredients: "Gram flour, salt, spices, oil"
                allergens: "May contain traces of nuts"
                shelfLife: "8 months"
                isVegetarian: true
                isGlutenFree: false
                ratingCount: 0
                keywords: ["namkeen", "snacks", "premium"]
                tags: ["bestseller", "new"]
                seo: {
                  metaTitle: "Buy Premium Namkeen Online - Best Quality"
                  metaDescription: "Shop premium quality namkeen online. Made with finest ingredients for the best taste."
                  metaKeywords: ["premium namkeen", "buy namkeen online", "quality snacks"]
                  canonicalUrl: "https://example.com/products/premium-namkeen"
                  ogTitle: "Premium Namkeen - Best Quality Snacks"
                  ogDescription: "Discover our premium namkeen made with the finest ingredients"
                  ogImage: "https://example.com/og/premium-namkeen.jpg"
                }
                variants: [{
                  sku: "PREM001"
                  name: "250g"
                  price: 80
                  mrp: 100
                  discountPercent: 20
                  discountSource: "product"
                  weight: 250
                  weightUnit: "g"
                  packageSize: "250g family pack"
                  length: 12
                  height: 18
                  breadth: 6
                  stockQuantity: 150
                  availabilityStatus: "in_stock"
                  images: [
                    { url: "https://example.com/namkeen1.jpg", alt: "Front view" }
                    { url: "https://example.com/namkeen2.jpg", alt: "Back view" }
                  ]
                  thumbnailUrl: "https://example.com/namkeen-thumb.jpg"
                  isDefault: true
                  isActive: true
                }]
              }) {
                _id
                name
                slug
                seo {
                  _id
                  productId
                  metaTitle
                  metaDescription
                  metaKeywords
                  canonicalUrl
                  ogTitle
                  ogDescription
                  ogImage
                }
                variants {
                  _id
                  sku
                  price
                  mrp
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const product = res.body.data.createProduct;
          expect(product.name).toBe('Premium Namkeen');
          expect(product.slug).toBe('premium-namkeen');
          expect(product.seo).toBeDefined();
          expect(product.seo.metaTitle).toBe('Buy Premium Namkeen Online - Best Quality');
          expect(product.seo.metaDescription).toBe('Shop premium quality namkeen online. Made with finest ingredients for the best taste.');
          expect(product.seo.metaKeywords).toEqual(['premium namkeen', 'buy namkeen online', 'quality snacks']);
          expect(product.seo.canonicalUrl).toBe('https://example.com/products/premium-namkeen');
          expect(product.seo.ogTitle).toBe('Premium Namkeen - Best Quality Snacks');
          expect(product.seo.ogDescription).toBe('Discover our premium namkeen made with the finest ingredients');
          expect(product.seo.ogImage).toBe('https://example.com/og/premium-namkeen.jpg');
          expect(product.variants).toHaveLength(1);
          expect(product.variants[0].price).toBe(80);
          expect(product.variants[0].mrp).toBe(100);
        });
    });

    it('should allow ADMIN to update a product', async () => {
      const product = await connection.collection('products').insertOne({
        name: "Original Name",
        slug: "original-slug",
        description: "Original",
        categoryId: categoryId,
        brand: "Original Brand",
        currency: "INR",
        ingredients: "Original ingredients",
        shelfLife: "6 months",
        isVegetarian: true,
        isGlutenFree: false,
        ratingCount: 0,
        keywords: [],
        tags: [],
        variants: [createTestVariant()],
        isArchived: false,
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
                seo: {
                  metaTitle: "Updated Meta Title"
                  metaDescription: "Updated meta description for SEO"
                  ogTitle: "Updated OG Title"
                }
              }) {
                _id
                name
                description
                seo {
                  metaTitle
                  metaDescription
                  ogTitle
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const product = res.body.data.updateProduct;
          expect(product.name).toBe('Updated Name');
          expect(product.description).toBe('Updated description');
          expect(product.seo).toBeDefined();
          expect(product.seo.metaTitle).toBe('Updated Meta Title');
          expect(product.seo.metaDescription).toBe('Updated meta description for SEO');
          expect(product.seo.ogTitle).toBe('Updated OG Title');
        });
    });

    it('should fail to create product with duplicate slug', async () => {
      await connection.collection('products').insertOne({
        name: "Unique Product",
        slug: "unique-product-slug",
        description: "Test",
        categoryId: categoryId,
        brand: "Test Brand",
        currency: "INR",
        ingredients: "Test ingredients",
        shelfLife: "6 months",
        isVegetarian: true,
        isGlutenFree: false,
        ratingCount: 0,
        keywords: [],
        tags: [],
        variants: [createTestVariant()],
        isArchived: false,
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
                currency: "INR"
                ingredients: "Test"
                shelfLife: "6 months"
                isVegetarian: true
                isGlutenFree: false
                ratingCount: 0
                keywords: ["test"]
                tags: ["test"]
                variants: [{
                  sku: "ANOTH001"
                  name: "100g"
                  price: 50
                  mrp: 60
                  discountPercent: 16.67
                  discountSource: "product"
                  weight: 100
                  weightUnit: "g"
                  packageSize: "100g"
                  length: 5
                  height: 5
                  breadth: 5
                  stockQuantity: 50
                  availabilityStatus: "in_stock"
                  images: [{ url: "https://example.com/img.jpg", alt: "Img" }]
                  thumbnailUrl: "https://example.com/thumb.jpg"
                  isDefault: true
                  isActive: true
                }]
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
                currency: "INR"
                ingredients: "Test"
                shelfLife: "6 months"
                isVegetarian: true
                isGlutenFree: false
                ratingCount: 0
                keywords: ["test"]
                tags: ["test"]
                variants: [{
                  sku: "USER001"
                  name: "100g"
                  price: 50
                  mrp: 60
                  discountPercent: 16.67
                  discountSource: "product"
                  weight: 100
                  weightUnit: "g"
                  packageSize: "100g"
                  length: 5
                  height: 5
                  breadth: 5
                  stockQuantity: 50
                  availabilityStatus: "in_stock"
                  images: [{ url: "https://example.com/img.jpg", alt: "Img" }]
                  thumbnailUrl: "https://example.com/thumb.jpg"
                  isDefault: true
                  isActive: true
                }]
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
        description: "Test",
        categoryId: categoryId,
        brand: "Test Brand",
        currency: "INR",
        ingredients: "Test ingredients",
        shelfLife: "6 months",
        isVegetarian: true,
        isGlutenFree: false,
        ratingCount: 0,
        keywords: [],
        tags: [],
        variants: [createTestVariant()],
        isArchived: false,
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
