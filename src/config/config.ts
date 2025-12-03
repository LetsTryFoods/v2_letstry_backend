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
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: process.env.BUCKET_NAME,
    region: process.env.AWS_REGION,
  },
});
