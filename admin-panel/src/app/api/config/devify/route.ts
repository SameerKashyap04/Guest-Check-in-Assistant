import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const ENV_FILE_PATH = path.join(process.cwd(), '.env.local');

export async function GET() {
  try {
    let apiUrl = process.env.DEVIFY_API_URL || 'https://devifypay.site';
    let apiKey = process.env.DEVIFY_API_KEY || '';
    let webhookSecret = process.env.DEVIFY_WEBHOOK_SECRET || '';

    // 1. Try reading from Firestore system_config/devify_config first (for Vercel/cloud)
    try {
      const docSnap = await getDoc(doc(db, 'system_config', 'devify_config'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.apiUrl) apiUrl = data.apiUrl;
        if (data.apiKey) apiKey = data.apiKey;
        if (data.webhookSecret) webhookSecret = data.webhookSecret;
      }
    } catch (dbErr) {
      console.warn('[ConfigAPI] Firestore lookup notice:', dbErr);
    }

    // 2. Read directly from .env.local file if present and not overridden
    try {
      if (fs.existsSync(ENV_FILE_PATH)) {
        const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
        const lines = envContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('DEVIFY_API_URL=') && !apiUrl) {
            apiUrl = trimmed.replace('DEVIFY_API_URL=', '').trim();
          } else if (trimmed.startsWith('DEVIFY_API_KEY=') && !apiKey) {
            apiKey = trimmed.replace('DEVIFY_API_KEY=', '').trim();
          } else if (trimmed.startsWith('DEVIFY_WEBHOOK_SECRET=') && !webhookSecret) {
            webhookSecret = trimmed.replace('DEVIFY_WEBHOOK_SECRET=', '').trim();
          }
        }
      }
    } catch (_) {}

    return NextResponse.json({ apiUrl, apiKey, webhookSecret });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiUrl, apiKey, webhookSecret } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const cleanUrl = (apiUrl || 'https://devifypay.site').trim();
    const cleanKey = apiKey.trim();
    const cleanSecret = (webhookSecret || '').trim();

    // 1. Always save to Firestore system_config/devify_config (cloud persistent storage)
    try {
      const docRef = doc(db, 'system_config', 'devify_config');
      await setDoc(docRef, {
        apiUrl: cleanUrl,
        apiKey: cleanKey,
        webhookSecret: cleanSecret,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err: any) {
      console.error('[ConfigAPI] Firestore write error:', err);
    }

    // 2. Also try writing to .env.local on disk if filesystem is writable (local dev)
    try {
      let envContent = '';
      if (fs.existsSync(ENV_FILE_PATH)) {
        envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
      } else {
        envContent = `# Devify Pay Credentials\n`;
      }

      const updateEnvVar = (content: string, key: string, val: string): string => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${val}`);
        } else {
          return content ? `${content.trim()}\n${key}=${val}\n` : `${key}=${val}\n`;
        }
      };

      envContent = updateEnvVar(envContent, 'DEVIFY_API_URL', cleanUrl);
      envContent = updateEnvVar(envContent, 'DEVIFY_API_KEY', cleanKey);
      envContent = updateEnvVar(envContent, 'DEVIFY_WEBHOOK_SECRET', cleanSecret);

      fs.writeFileSync(ENV_FILE_PATH, envContent, 'utf-8');
    } catch (fsErr) {
      // Ignored on read-only serverless environments like Vercel
      console.info('[ConfigAPI] Local filesystem is read-only (e.g. Vercel), saved to Firestore.');
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials saved successfully to cloud storage!',
      apiUrl: cleanUrl,
      apiKey: cleanKey,
      webhookSecret: cleanSecret,
    });
  } catch (error: any) {
    console.error('[ConfigAPI] Error saving config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
