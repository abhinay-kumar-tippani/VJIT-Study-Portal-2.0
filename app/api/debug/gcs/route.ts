import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasBucketName: !!process.env.GCS_BUCKET_NAME,
    bucketName: process.env.GCS_BUCKET_NAME || 'MISSING',
    hasServiceKey: !!process.env.GCS_SERVICE_ACCOUNT_KEY_JSON,
    serviceKeyLength: process.env.GCS_SERVICE_ACCOUNT_KEY_JSON?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  });
}
