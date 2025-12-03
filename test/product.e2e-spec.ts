import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';

describe('Product (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let authToken: string;
  let categoryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    connection = moduleFixture.get<Connection>(getConnectionToken());
    await app.init();

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
                _id
                name
                slug
                price
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.products).toEqual([]);
        });
    });

    it('should get products with category field resolver', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Masala Sev"
                slug: "masala-sev"
                description: "Crispy masala sev"
                categoryId: "${categoryId}"
                brand: "Local Brand"
                sku: "SKU001"
                images: [{ url: "https://example.com/sev.jpg", alt: "Masala Sev" }]
                thumbnailUrl: "https://example.com/sev-thumb.jpg"
                price: 50
                mrp: 60
                discountPercent: 16.67
                currency: "INR"
                length: 10
                height: 15
                breadth: 5
                weight: 200
                weightUnit: "g"
                packageSize: "200g pack"
                ingredients: "Gram flour, spices"
                shelfLife: "6 months"
                isVegetarian: true
                isGlutenFree: false
                availabilityStatus: "in_stock"
                stockQuantity: 100
                ratingCount: 0
                keywords: ["sev", "snacks"]
                tags: ["bestseller"]
                discountSource: "product"
              }) {
                _id
                name
              }
            }
          `,
        });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              products {
                _id
                name
                category {
                  id
                  name
                  slug
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.products).toHaveLength(1);
          expect(res.body.data.products[0].category).toBeDefined();
          expect(res.body.data.products[0].category.name).toBe('Snacks');
        });
    });

    it('should get product by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Test Product"
                slug: "test-product"
                description: "Test description"
                categoryId: "${categoryId}"
                brand: "Test Brand"
                sku: "TEST001"
                images: [{ url: "https://example.com/test.jpg", alt: "Test" }]
                thumbnailUrl: "https://example.com/thumb.jpg"
                price: 100
                mrp: 120
                discountPercent: 16.67
                currency: "INR"
                length: 10
                height: 10
                breadth: 10
                weight: 500
                weightUnit: "g"
                packageSize: "500g"
                ingredients: "Test ingredients"
                shelfLife: "12 months"
                isVegetarian: true
                isGlutenFree: true
                availabilityStatus: "in_stock"
                stockQuantity: 50
                ratingCount: 0
                keywords: ["test"]
                tags: ["new"]
                discountSource: "product"
              }) {
                _id
              }
            }
          `,
        });

      const productId = createResponse.body.data.createProduct._id;

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
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Slug Test"
                slug: "slug-test"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "SLUG001"
                images: [{ url: "https://example.com/img.jpg", alt: "Img" }]
                thumbnailUrl: "https://example.com/thumb.jpg"
                price: 75
                mrp: 90
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
                stockQuantity: 25
                ratingCount: 0
                keywords: ["slug"]
                tags: ["test"]
                discountSource: "product"
              }) {
                _id
              }
            }
          `,
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
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Category Product 1"
                slug: "category-product-1"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "CAT001"
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
                stockQuantity: 30
                ratingCount: 0
                keywords: ["test"]
                tags: ["test"]
                discountSource: "product"
              }) {
                _id
              }
            }
          `,
        });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              productsByCategory(categoryId: "${categoryId}") {
                _id
                name
                categoryId
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.productsByCategory).toHaveLength(1);
          expect(res.body.data.productsByCategory[0].categoryId).toBe(
            categoryId,
          );
        });
    });

    it('should search products', async () => {
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Spicy Masala Chips"
                slug: "spicy-masala-chips"
                description: "Hot and spicy chips"
                categoryId: "${categoryId}"
                brand: "Chips Co"
                sku: "CHIPS001"
                images: [{ url: "https://example.com/chips.jpg", alt: "Chips" }]
                thumbnailUrl: "https://example.com/chips-thumb.jpg"
                price: 30
                mrp: 40
                discountPercent: 25
                currency: "INR"
                length: 8
                height: 12
                breadth: 3
                weight: 150
                weightUnit: "g"
                packageSize: "150g"
                ingredients: "Potato, spices"
                shelfLife: "9 months"
                isVegetarian: true
                isGlutenFree: false
                availabilityStatus: "in_stock"
                stockQuantity: 200
                ratingCount: 0
                keywords: ["chips", "spicy", "masala"]
                tags: ["popular"]
                discountSource: "product"
              }) {
                _id
              }
            }
          `,
        });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              searchProducts(searchTerm: "masala") {
                _id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.searchProducts.length).toBeGreaterThan(0);
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

  describe('Product Mutations (Protected)', () => {
    it('should create a product', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
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
                description
                brand
                sku
                price
                mrp
                discountPercent
                images {
                  url
                  alt
                }
                isVegetarian
                stockQuantity
                createdAt
                updatedAt
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
          expect(product.images).toHaveLength(2);
          expect(product.isVegetarian).toBe(true);
          expect(product._id).toBeDefined();
          expect(product.createdAt).toBeDefined();
        });
    });

    it('should update a product', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Original Name"
                slug: "original-slug"
                description: "Original"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "ORIG001"
                images: [{ url: "https://example.com/orig.jpg", alt: "Original" }]
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
        });

      const productId = createResponse.body.data.createProduct._id;

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
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
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Unique Product"
                slug: "unique-product-slug"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "UNIQ001"
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
        });

      // Try to create another product with the same slug
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
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

    it('should fail to update product with duplicate slug', async () => {
      // Create first product
      const product1Response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Product One"
                slug: "product-one"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "PROD001"
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
        });

      // Create second product
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Product Two"
                slug: "product-two"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "PROD002"
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
        });

      const product1Id = product1Response.body.data.createProduct._id;

      // Try to update first product with second product's slug
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              updateProduct(id: "${product1Id}", input: {
                slug: "product-two"
              }) {
                _id
                slug
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.errors).toBeDefined();
          expect(res.body.errors[0].message).toContain(
            "Product with slug 'product-two' already exists",
          );
        });
    });

    it('should auto-generate unique slug from name', async () => {
      // Create first product without slug
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Auto Generated Slug"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "AUTO001"
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
                slug
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createProduct.slug).toBe('auto-generated-slug');
        });

      // Create second product with same name - should get unique slug
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Auto Generated Slug"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "AUTO002"
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
                slug
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createProduct.slug).toBe(
            'auto-generated-slug-1',
          );
        });
    });

    it('should update product stock', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Stock Test"
                slug: "stock-test"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "STOCK001"
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
                stockQuantity: 100
                ratingCount: 0
                keywords: ["test"]
                tags: ["test"]
                discountSource: "product"
              }) {
                _id
              }
            }
          `,
        });

      const productId = createResponse.body.data.createProduct._id;

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              updateProductStock(id: "${productId}", quantity: 150) {
                _id
                stockQuantity
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.updateProductStock.stockQuantity).toBe(150);
        });
    });

    it('should delete a product', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Delete Test"
                slug: "delete-test"
                description: "To be deleted"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "DEL001"
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
        });

      const productId = createResponse.body.data.createProduct._id;

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              deleteProduct(id: "${productId}") {
                _id
                name
                isArchived
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.deleteProduct._id).toBe(productId);
          expect(res.body.data.deleteProduct.name).toBe('Delete Test');
          expect(res.body.data.deleteProduct.isArchived).toBe(true);
        });
    });

    it('should archive a product', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Archive Test"
                slug: "archive-test"
                description: "To be archived"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "ARCH001"
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
        });

      const productId = createResponse.body.data.createProduct._id;

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              archiveProduct(id: "${productId}") {
                _id
                name
                isArchived
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.archiveProduct._id).toBe(productId);
          expect(res.body.data.archiveProduct.isArchived).toBe(true);
        });
    });

    it('should unarchive a product', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Unarchive Test"
                slug: "unarchive-test"
                description: "To be unarchived"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "UNARCH001"
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
        });

      const productId = createResponse.body.data.createProduct._id;

      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              archiveProduct(id: "${productId}") {
                _id
              }
            }
          `,
        });

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              unarchiveProduct(id: "${productId}") {
                _id
                name
                isArchived
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.unarchiveProduct._id).toBe(productId);
          expect(res.body.data.unarchiveProduct.isArchived).toBe(false);
        });
    });

    it('should return error for unauthorized access to mutations', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Unauthorized"
                slug: "unauthorized"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "UNAUTH001"
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
          expect(res.body.errors[0].message).toContain('Unauthorized');
        });
    });
  });

  describe('Category with Products Field Resolver', () => {
    it('should get category with products', async () => {
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Product in Category 1"
                slug: "product-in-category-1"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "PIC001"
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
                stockQuantity: 30
                ratingCount: 0
                keywords: ["test"]
                tags: ["test"]
                discountSource: "product"
              }) {
                _id
              }
            }
          `,
        });

      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: `
            mutation {
              createProduct(input: {
                name: "Product in Category 2"
                slug: "product-in-category-2"
                description: "Test"
                categoryId: "${categoryId}"
                brand: "Brand"
                sku: "PIC002"
                images: [{ url: "https://example.com/img.jpg", alt: "Img" }]
                thumbnailUrl: "https://example.com/thumb.jpg"
                price: 60
                mrp: 70
                discountPercent: 14.29
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
                stockQuantity: 40
                ratingCount: 0
                keywords: ["test"]
                tags: ["test"]
                discountSource: "product"
              }) {
                _id
              }
            }
          `,
        });

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              category(id: "${categoryId}") {
                id
                name
                products {
                  _id
                  name
                  price
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.category).toBeDefined();
          expect(res.body.data.category.products).toHaveLength(2);
          expect(res.body.data.category.products[0].name).toBeDefined();
        });
    });
  });
});
