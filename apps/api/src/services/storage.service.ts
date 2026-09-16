export interface UploadInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder?: string;
  userId?: string;
}

export interface StoredFile {
  fileId: string;
  url: string;
  provider: 'cloudinary' | 'local';
  publicId?: string;
  mimeType: string;
  sizeBytes: number;
}

export interface FileStorage {
  upload(input: UploadInput): Promise<StoredFile>;
  getUrl(fileId: string): Promise<string>;
  delete(fileId: string): Promise<void>;
}

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class CloudinaryStorage implements FileStorage {
  constructor() {
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    return new Promise((resolve, reject) => {
      const folder = input.folder || process.env.CLOUDINARY_FOLDER || 'wrectifai';
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (err, result) => {
          if (err || !result) {
            return reject(new Error(`Cloudinary upload failed: ${err?.message || 'Unknown error'}`));
          }
          resolve({
            fileId: result.public_id,
            url: result.secure_url,
            provider: 'cloudinary',
            publicId: result.public_id,
            mimeType: input.mimeType,
            sizeBytes: input.buffer.length,
          });
        }
      );
      uploadStream.end(input.buffer);
    });
  }

  async getUrl(fileId: string): Promise<string> {
    return cloudinary.url(fileId, { secure: true });
  }

  async delete(fileId: string): Promise<void> {
    await cloudinary.uploader.destroy(fileId);
  }
}

export class LocalStorageProvider implements FileStorage {
  private uploadDir: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir || path.join(process.cwd(), 'uploads');
  }

  private async ensureDir() {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    await this.ensureDir();
    const ext = path.extname(input.filename) || '.bin';
    const uniqueName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filePath = path.join(this.uploadDir, uniqueName);
    await fs.writeFile(filePath, input.buffer);

    return {
      fileId: uniqueName,
      url: `/uploads/${uniqueName}`,
      provider: 'local',
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
    };
  }

  async getUrl(fileId: string): Promise<string> {
    return `/uploads/${fileId}`;
  }

  async delete(fileId: string): Promise<void> {
    const filePath = path.join(this.uploadDir, fileId);
    await fs.unlink(filePath).catch(() => {});
  }
}

export function createStorageProvider(): FileStorage {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    return new CloudinaryStorage();
  }
  return new LocalStorageProvider();
}
