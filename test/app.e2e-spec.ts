import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AdminService } from '../src/admin/admin.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});

describe('Admin Auth (e2e)', () => {
  let app: INestApplication<App>;
  let adminService: AdminService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    adminService = moduleFixture.get(AdminService);
  });

  afterEach(async () => {
    // Clean up test data
    if (adminService) {
      const adminModel = (adminService as any).adminModel;
      if (adminModel) {
        await adminModel.deleteMany({});
      }
    }
    await app.close();
  });

  it('should create an admin', () => {
    const createAdminMutation = `
      mutation {
        createAdmin(email: "test@example.com", password: "testpass123")
      }
    `;

    return request(app.getHttpServer())
      .post('/graphql')
      .send({ query: createAdminMutation })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.createAdmin).toContain('Admin created');
      });
  });

  it('should login admin and return JWT token', async () => {
    // First create an admin
    await adminService.create({
      email: 'test@example.com',
      password: 'testpass123',
    });

    const loginMutation = `
      mutation {
        adminLogin(email: "test@example.com", password: "testpass123")
      }
    `;

    return request(app.getHttpServer())
      .post('/graphql')
      .send({ query: loginMutation })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.adminLogin).toBeDefined();
        expect(typeof res.body.data.adminLogin).toBe('string');
        // JWT token should be a string
        expect(res.body.data.adminLogin.length).toBeGreaterThan(10);
      });
  });

  it('should fail login with wrong credentials', () => {
    const loginMutation = `
      mutation {
        adminLogin(email: "wrong@example.com", password: "wrongpass")
      }
    `;

    return request(app.getHttpServer())
      .post('/graphql')
      .send({ query: loginMutation })
      .expect(200)
      .expect((res) => {
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toBe('Invalid credentials');
      });
  });

  it('should handle CSRF protection for GET requests', () => {
    // GET request without required headers should fail
    return request(app.getHttpServer())
      .get('/graphql?query={__typename}')
      .expect(400);
  });

  it('should allow GET requests with Apollo-Require-Preflight header', () => {
    return request(app.getHttpServer())
      .get('/graphql?query={__typename}')
      .set('Apollo-Require-Preflight', 'true')
      .expect(200)
      .expect((res) => {
        expect(res.body.data.__typename).toBe('Query');
      });
  });
});
