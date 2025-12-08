import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { FirebaseService } from '../src/firebase/firebase.service';
import { mockFirebaseService } from './common/firebase.mock';

describe('Cart (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userToken: string;
  let productId: string;

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

    // Setup User
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
                phoneNumber: "+919876543210",
                firstName: "Test",
                lastName: "User",
                firebaseUid: "S3XyJV3kNZRue5MFxrLF5stbWrK2"
              }
            )
          }
        `,
      });
    userToken = userSignupResponse.body.data.verifyOtpAndLogin;

    // Setup Product
    await connection.collection('products').deleteMany({});
    const product = await connection.collection('products').insertOne({
      name: "Test Product",
      slug: "test-product",
      price: 100,
      mrp: 120,
      isArchived: false,
      availabilityStatus: "in_stock",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    productId = product.insertedId.toString();

    // Setup Charges
    await connection.collection('charges').deleteMany({});
    await connection.collection('charges').insertOne({
      active: true,
      handlingCharge: 10,
      gstPercentage: 18,
      freeDeliveryThreshold: 500,
      deliveryDelhiBelowThreshold: 40,
      deliveryRestBelowThreshold: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    await connection.collection('carts').deleteMany({});
  });

  describe('Cart Lifecycle', () => {
    let agent: any;

    beforeEach(() => {
      // Create an agent that maintains cookies across requests
      agent = request.agent(app.getHttpServer());
    });

    it('should add item to cart', () => {
      return agent
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              addToCart(input: {
                productId: "${productId}"
                quantity: 2
              }) {
                _id
                items {
                  productId
                  quantity
                  totalPrice
                }
                totalsSummary {
                  subtotal
                  grandTotal
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const cart = res.body.data.addToCart;
          expect(cart.items).toHaveLength(1);
          expect(cart.items[0].quantity).toBe(2);
          expect(cart.items[0].totalPrice).toBe(200); // 100 * 2
          expect(cart.totalsSummary.subtotal).toBe(200);
          // 200 (subtotal) + 10 (handling) = 210
          expect(cart.totalsSummary.grandTotal).toBe(210);
        });
    });

    it('should update cart item', async () => {
      // First add item using the agent
      await agent
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              addToCart(input: { productId: "${productId}", quantity: 1 }) { _id }
            }
          `,
        });

      // Then update using the same agent (cookies preserved)
      return agent
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              updateCartItem(input: {
                productId: "${productId}"
                quantity: 5
              }) {
                items {
                  quantity
                  totalPrice
                }
                totalsSummary {
                  subtotal
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const cart = res.body.data.updateCartItem;
          expect(cart.items[0].quantity).toBe(5);
          expect(cart.items[0].totalPrice).toBe(500);
          expect(cart.totalsSummary.subtotal).toBe(500);
        });
    });

    it('should remove item from cart', async () => {
      // First add item using the agent
      await agent
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              addToCart(input: { productId: "${productId}", quantity: 1 }) { _id }
            }
          `,
        });

      // Then remove using the same agent (cookies preserved)
      return agent
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              removeFromCart(productId: "${productId}") {
                items {
                  productId
                }
                totalsSummary {
                  subtotal
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const cart = res.body.data.removeFromCart;
          expect(cart.items).toHaveLength(0);
          expect(cart.totalsSummary.subtotal).toBe(0);
        });
    });

    it('should clear cart', async () => {
      // First add item using the agent
      await agent
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              addToCart(input: { productId: "${productId}", quantity: 1 }) { _id }
            }
          `,
        });

      // Then clear using the same agent (cookies preserved)
      return agent
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              clearCart {
                items {
                  productId
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.clearCart.items).toHaveLength(0);
        });
    });
  });
});
