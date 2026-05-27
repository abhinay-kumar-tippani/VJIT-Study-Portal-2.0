import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

export async function GET() {
  try {
    // Test 1: Parse the service account key
    let credentials;
    try {
      const keyJson = process.env.GCS_SERVICE_ACCOUNT_KEY_JSON!;
      // Try direct JSON parse first
      try {
        credentials = JSON.parse(keyJson);
      } catch {
        // Try base64 decode then parse
        const decoded = Buffer.from(keyJson, 'base64').toString('utf-8');
        credentials = JSON.parse(decoded);
      }
    } catch (e) {
      return NextResponse.json({ 
        step: 'FAILED at key parsing',
        error: String(e)
      });
    }

    // Test 2: Initialize GCS client
    let storage;
    try {
      storage = new Storage({ credentials });
    } catch (e) {
      return NextResponse.json({ 
        step: 'FAILED at Storage init',
        error: String(e),
        projectId: credentials?.project_id || 'missing'
      });
    }

    // Test 3: Check bucket exists and is accessible
    try {
      const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);
      const [exists] = await bucket.exists();
      return NextResponse.json({ 
        step: 'SUCCESS',
        bucketExists: exists,
        projectId: credentials?.project_id,
        clientEmail: credentials?.client_email,
        bucketName: process.env.GCS_BUCKET_NAME
      });
    } catch (e) {
      return NextResponse.json({ 
        step: 'FAILED at bucket check',
        error: String(e),
        projectId: credentials?.project_id,
        clientEmail: credentials?.client_email
      });
    }

  } catch (e) {
    return NextResponse.json({ step: 'UNEXPECTED ERROR', error: String(e) });
  }
}
