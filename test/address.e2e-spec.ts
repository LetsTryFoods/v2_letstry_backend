import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { FirebaseService } from '../src/firebase/firebase.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { mockFirebaseService } from './common/firebase.mock';

describe('Address (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseService)
      .useValue(mockFirebaseService)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    connection = moduleFixture.get<Connection>(getConnectionToken());
    await app.init();

    // Setup User
    await connection.collection('users').deleteMany({});
    await connection.collection('firebaseauths').deleteMany({});
    await connection.collection('addresses').deleteMany({});

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
    if (userSignupResponse.body.errors) {
      console.error('User Signup Errors:', JSON.stringify(userSignupResponse.body.errors, null, 2));
    }
    userToken = userSignupResponse.body.data.verifyOtpAndLogin;
    
    // Get User ID
    const user = await connection.collection('users').findOne({ phoneNumber: '+919876543210' });
    userId = user._id.toString();
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  beforeEach(async () => {
    await connection.collection('addresses').deleteMany({});
  });

  describe('Address Mutations', () => {
    it('should create an address', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              createAddress(input: {
                name: "Test User",
                streetAddress: "123 Test St",
                addressLocality: "Test City",
                addressRegion: "Test Region",
                postalCode: "123456",
                addressCountry: "IN",
                telephone: "+919876543210",
                isDefault: true
              }) {
                _id
                name
                streetAddress
                isDefault
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const address = res.body.data.createAddress;
          expect(address.name).toBe('Test User');
          expect(address.streetAddress).toBe('123 Test St');
          expect(address.isDefault).toBe(true);
        });
    });

    it('should update an address', async () => {
      const address = await connection.collection('addresses').insertOne({
        userId: connection.collection('users').findOne({}).then(u => u._id), // This is async, need to fix
        // Better to use the userId we got in beforeAll, but need to cast it to ObjectId if schema uses ObjectId
        // However, the schema defines userId as string in Prop ref, but usually it's ObjectId in DB.
        // Let's rely on the create mutation to set it up correctly first or insert carefully.
        // Actually, let's just use the create mutation helper or insert directly with correct ID.
        userId: (await connection.collection('users').findOne({ phoneNumber: '+919876543210' }))._id,
        name: "Old Name",
        streetAddress: "Old Address",
        addressLocality: "City",
        addressRegion: "Region",
        postalCode: "111111",
        addressCountry: "IN",
        telephone: "1111111111",
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const addressId = address.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              updateAddress(id: "${addressId}", input: {
                name: "Updated Name"
              }) {
                _id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.updateAddress.name).toBe('Updated Name');
        });
    });

    it('should delete an address', async () => {
      const address = await connection.collection('addresses').insertOne({
        userId: (await connection.collection('users').findOne({ phoneNumber: '+919876543210' }))._id,
        name: "To Delete",
        streetAddress: "Address",
        addressLocality: "City",
        addressRegion: "Region",
        postalCode: "111111",
        addressCountry: "IN",
        telephone: "1111111111",
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const addressId = address.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              deleteAddress(id: "${addressId}") {
                _id
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.deleteAddress._id).toBe(addressId);
        });
    });
  });

  describe('Address Queries', () => {
    it('should get my addresses', async () => {
      await connection.collection('addresses').insertOne({
        userId: (await connection.collection('users').findOne({ phoneNumber: '+919876543210' }))._id,
        name: "My Address",
        streetAddress: "Address",
        addressLocality: "City",
        addressRegion: "Region",
        postalCode: "111111",
        addressCountry: "IN",
        telephone: "1111111111",
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            query {
              myAddresses {
                _id
                name
                isDefault
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.myAddresses).toHaveLength(1);
          expect(res.body.data.myAddresses[0].name).toBe('My Address');
        });
    });

    it('should get address by id', async () => {
      const address = await connection.collection('addresses').insertOne({
        userId: (await connection.collection('users').findOne({ phoneNumber: '+919876543210' }))._id,
        name: "Single Address",
        streetAddress: "Address",
        addressLocality: "City",
        addressRegion: "Region",
        postalCode: "111111",
        addressCountry: "IN",
        telephone: "1111111111",
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const addressId = address.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            query {
              address(id: "${addressId}") {
                _id
                name
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.address.name).toBe('Single Address');
        });
    });
  });
});
