import { Storage } from '@google-cloud/storage';

let storage: Storage | null = null;

function getStorage(): Storage {
  if (storage) return storage;
  const keyJson = process.env.GCS_SERVICE_ACCOUNT_KEY_JSON;
  if (!keyJson) throw new Error('GCS_SERVICE_ACCOUNT_KEY_JSON is not set');
  const credentials = JSON.parse(Buffer.from(keyJson, 'base64').toString('utf8'));
  storage = new Storage({ credentials });
  return storage;
}

/**
 * Generates a V4 signed URL for a GCS object (PUT method).
 * The client uploads directly to GCS — zero server bandwidth cost.
 */
export async function generateSignedUploadUrl(
  fileName: string,
  contentType: string,
  expiresInMinutes = 15
): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) throw new Error('GCS_BUCKET_NAME is not set');

  const gcs = getStorage();
  const bucket = gcs.bucket(bucketName);
  const file = bucket.file(`uploads/${Date.now()}-${fileName}`);

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
    contentType,
  });

  return signedUrl;
}

export function getPublicUrl(gcsPath: string): string {
  const bucketName = process.env.GCS_BUCKET_NAME ?? '';
  return `https://storage.googleapis.com/${bucketName}/${gcsPath}`;
}
