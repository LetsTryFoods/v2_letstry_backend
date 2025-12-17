export default () => ({
  database: {
    uri: process.env.DATABASE_URL,
    name: process.env.DATABASE_NAME || 'letstry_dev',
    options: {},
  },
  port: {
    server_port: process.env.PORT,
  },
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    errorFile: process.env.ERROR_LOG_FILE || 'logs/error.log',
    debugFile: process.env.DEBUG_LOG_FILE || 'logs/debug.log',
    redisFile: process.env.REDIS_LOG_FILE || 'logs/redis.log',
    guestConversionFile: process.env.GUEST_CONVERSION_LOG_FILE || 'logs/guest-conversion.log',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: process.env.BUCKET_NAME,
    region: process.env.AWS_REGION,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  },
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://nurenaiautomatic-b7hmdnb4fzbpbtbh.canadacentral-01.azurewebsites.net/webhook/send-template',
    jwtToken: process.env.WHATSAPP_JWT_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkxldHNUcnkiLCJhZG1pbiI6dHJ1ZX0.gJvhuRhqKjVS_Gc0T87vjE9EAGKBzfx09SpJVpUcb1I',
  },
  cart: {
    applyCouponOnMrp: process.env.APPLY_COUPON_ON_MRP === 'true',
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    apiSecret: process.env.GOOGLE_MAPS_API_SECRET,
  },
  payment: {
    gateway: process.env.PAYMENT_GATEWAY || 'ZAAKPAY',
  },
  zaakpay: {
    merchantIdentifier: process.env.ZAAKPAY_MERCHANT_IDENTIFIER || 'ec1aef36b2074f3790e193627ee7c7ca',
    encryptionKeyId: process.env.ZAAKPAY_ENCRYPTION_KEY_ID || '9TodiedMJgabjBU',
    publicKey: process.env.ZAAKPAY_PUBLIC_KEY || 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1m2fmIoRqDlF2ntbQAYSMGfiyy5wAWUeiBC9oAWoKkSWypudfDT9oz46G7sbdPSvxtszkd1Vjux0hkhac+gNNbWjT8f5JLcj8a0cXFqsmcL5WKQD47/48r9UP8rMTftrOcU8avsSkLaoGOGa+QOEmVduGBXQpM9WenbGAZtoxj6fK8+x77BLOCSEeqrY8s+sBMxne6UFxLbakASzXA3SZ+IxeU0pS3CnvjUh2zJRFkSlV4gBxD5jYAB2oZPsjSrDXhQ8fLxpg7g0pHfB+bcebOLvgEVw2CW1Tla/sih8FuPwxPth1TVKe0VXPjox3dG7ZSYMrh3v21KjaGC7HeZTKQIDAQAB',
    secretKey: process.env.ZAAKPAY_SECRET_KEY || 'a3833da3c2234d218568a690c1714e5d',
    returnUrl: process.env.ZAAKPAY_RETURN_URL || 'http://localhost:3000/payment/callback',
    environment: process.env.ZAAKPAY_ENVIRONMENT || 'staging',
    baseUrl: (process.env.ZAAKPAY_ENVIRONMENT || 'staging') != 'production' 
      ? 'https://api.zaakpay.com' 
      : 'https://zaakstaging.zaakpay.com',
    endpoints: {
      expressCheckout: '/api/paymentTransact/V8',
      customCheckout: '/transactU?v=8',
      validateCard: '/validateCard',
      checkTxn: '/checkTxn?v=5',
      refund: '/refund',
      settlementReport: '/settlement',
    },
  },
});
