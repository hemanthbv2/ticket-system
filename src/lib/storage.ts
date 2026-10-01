/**
 * Storage interface — swappable backend.
 * Start with local filesystem; switch to S3 / Google Drive later.
 */

import fs from "fs";
import path from "path";

export interface StorageProvider {
  save(file: Buffer, fileName: string, mime: string): Promise<string>;
  getUrl(filePath: string): string;
  delete(filePath: string): Promise<void>;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

class LocalStorageProvider implements StorageProvider {
  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  async save(file: Buffer, fileName: string, mime: string): Promise<string> {
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const finalName = `${timestamp}-${safeName}`;
    const filePath = path.join(UPLOAD_DIR, finalName);
    fs.writeFileSync(filePath, file);
    return `/api/uploads/${finalName}`;
  }

  getUrl(filePath: string): string {
    return filePath;
  }

  async delete(filePath: string): Promise<void> {
    const fileName = filePath.replace("/api/uploads/", "");
    const fullPath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}

// Singleton
let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    storageInstance = new LocalStorageProvider();
  }
  return storageInstance;
}
