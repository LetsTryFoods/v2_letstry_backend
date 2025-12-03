import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import sharp from 'sharp';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private readonly logger = new Logger(UploadService.name);

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId')!,
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey')!,
      },
    });
  }

  getContentTypeFromExtension(filename: string): string {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  getS3Client(): S3Client {
    return this.s3Client;
  }

  getBucketName(): string {
    return this.configService.get<string>('aws.bucketName')!;
  }

  getS3Url(key: string): string {
    const bucketName = this.configService.get<string>('aws.bucketName')!;
    const region = this.configService.get<string>('aws.region')!;
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  }

  getCloudFrontUrl(key: string): string {
    return `https://d11a0m43ek7ap8.cloudfront.net/${key}`;
  }

  async getPresignedUrl(key: string): Promise<string> {
    const bucketName = this.configService.get<string>('aws.bucketName')!;
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  async getPresignedUploadUrl(key: string, contentType?: string): Promise<string> {
    const bucketName = this.configService.get<string>('aws.bucketName')!;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  async generatePresignedUploadData(filename: string, contentType?: string) {
    if (!filename) {
      throw new Error('Filename is required');
    }

    const uid = crypto.randomBytes(16).toString('hex');
    const extension = filename.includes('.')
      ? filename.substring(filename.lastIndexOf('.'))
      : '';
    const key = `${uid}${extension}`;

    const uploadUrl = await this.getPresignedUploadUrl(key, contentType);
    const finalKey = this.isImageFile(contentType || '') &&
      !filename.toLowerCase().endsWith('.webp')
        ? key.replace(/\.[^.]+$/, '.webp')
        : key;
    const finalUrl = this.getCloudFrontUrl(finalKey);

    return {
      uploadUrl,
      key: finalKey,
      finalUrl,
      baseUrl: 'https://d11a0m43ek7ap8.cloudfront.net/',
    };
  }

  isImageFile(contentType: string): boolean {
    return contentType.startsWith('image/');
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    originalName: string,
  ): Promise<void> {
    const bucketName = this.getBucketName();
    const contentType = this.getContentTypeFromExtension(originalName);

    if (this.isImageFile(contentType)) {
      const webpBuffer = await sharp(buffer).webp({ quality: 10 }).toBuffer();
      const webpKey = key.replace(/\.[^.]+$/, '.webp');
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: webpKey,
          Body: webpBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000',
        }),
      );
      this.logger.debug(`Converted and uploaded ${originalName} to ${webpKey}`);
    } else {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000',
        }),
      );
      this.logger.debug(`Uploaded ${originalName} as ${key}`);
    }
  }

  async uploadFiles(
    files: { key: string; buffer: Buffer; originalName: string }[],
  ): Promise<void> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file.key, file.buffer, file.originalName),
    );
    await Promise.all(uploadPromises);
    this.logger.debug(`Uploaded ${files.length} files`);
  }
}
