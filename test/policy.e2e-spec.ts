import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../src/firebase/firebase.service';
import { mockFirebaseService } from './common/firebase.mock';

describe('Policy (e2e)', () => {
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
    await connection.collection('policies').deleteMany({});
  });

  describe('Policy Queries (Public)', () => {
    it('should get empty policies list', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              policies {
                _id
                title
                type
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.policies).toEqual([]);
        });
    });

    it('should get policies by type', async () => {
       await connection.collection('policies').insertMany([
         { title: 'Privacy Policy', type: 'privacy', content: 'Content', createdAt: new Date(), updatedAt: new Date() },
         { title: 'Terms of Service', type: 'terms', content: 'Content', createdAt: new Date(), updatedAt: new Date() }
       ]);

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              policiesByType(type: "privacy") {
                _id
                title
                type
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.policiesByType).toHaveLength(1);
          expect(res.body.data.policiesByType[0].title).toBe('Privacy Policy');
        });
    });

    it('should get policy by id', async () => {
       const policy = await connection.collection('policies').insertOne({
         title: 'Test Policy',
         type: 'test',
         content: 'Test Content',
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const policyId = policy.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              policy(id: "${policyId}") {
                _id
                title
                content
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.policy.title).toBe('Test Policy');
          expect(res.body.data.policy.content).toBe('Test Content');
        });
    });

    it('should return null for non-existent policy id', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              policy(id: "656e9b5a9d8f9b001f9b0000") {
                _id
                title
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.policy).toBeNull();
        });
    });
  });

  describe('Policy Mutations (Admin Only)', () => {
    it('should allow ADMIN to create a policy', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              createPolicy(input: {
                title: "Refund Policy"
                type: "refund"
                content: "Refund Content"
              }) {
                _id
                title
                type
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createPolicy.title).toBe('refund-policy');
          expect(res.body.data.createPolicy.type).toBe('refund');
        });
    });

    it('should allow ADMIN to update a policy', async () => {
       const policy = await connection.collection('policies').insertOne({
         title: 'Old Title',
         type: 'old',
         content: 'Old Content',
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const policyId = policy.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              updatePolicy(id: "${policyId}", input: {
                title: "New Title"
              }) {
                _id
                title
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.updatePolicy.title).toBe('new-title');
        });
    });

    it('should allow ADMIN to delete a policy', async () => {
       const policy = await connection.collection('policies').insertOne({
         title: 'To Delete',
         type: 'delete',
         content: 'Content',
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const policyId = policy.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              deletePolicy(id: "${policyId}") {
                _id
                title
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.deletePolicy.title).toBe('To Delete');
        });
    });

    it('should return error when updating non-existent policy', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: `
            mutation {
              updatePolicy(id: "656e9b5a9d8f9b001f9b0000", input: {
                title: "New Title"
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

  describe('Policy Mutations (Forbidden for User)', () => {
    it('should FORBID USER from creating a policy', () => {
      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              createPolicy(input: {
                title: "User Policy"
                type: "user"
                content: "Content"
              }) {
                _id
                title
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

    it('should FORBID USER from updating a policy', async () => {
       const policy = await connection.collection('policies').insertOne({
         title: 'Test',
         type: 'test',
         content: 'Content',
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const policyId = policy.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              updatePolicy(id: "${policyId}", input: {
                title: "Hacked"
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

    it('should FORBID USER from deleting a policy', async () => {
       const policy = await connection.collection('policies').insertOne({
         title: 'Test',
         type: 'test',
         content: 'Content',
         createdAt: new Date(),
         updatedAt: new Date()
       });
       const policyId = policy.insertedId.toString();

      return request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: `
            mutation {
              deletePolicy(id: "${policyId}") {
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
