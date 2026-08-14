import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const ENV_FILE_PATH = path.join(process.cwd(), '.env.local');

export async function GET() {
  try {
    let apiUrl = process.env.DEVIFY_API_URL || 'https://devifypay.site';
    let apiKey = process.env.DEVIFY_API_KEY || '';
    let webhookSecret = process.env.DEVIFY_WEBHOOK_SECRET || '';

    // Read directly from .env.local file if present
    if (fs.existsSync(ENV_FILE_PATH)) {
      const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DEVIFY_API_URL=')) {
          apiUrl = trimmed.replace('DEVIFY_API_URL=', '').trim();
        } else if (trimmed.startsWith('DEVIFY_API_KEY=')) {
          apiKey = trimmed.replace('DEVIFY_API_KEY=', '').trim();
        } else if (trimmed.startsWith('DEVIFY_WEBHOOK_SECRET=')) {
          webhookSecret = trimmed.replace('DEVIFY_WEBHOOK_SECRET=', '').trim();
        }
      }
    }

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

    // 1. Update/write to .env.local on disk
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

    // 2. Also save to Firestore system_config/devify_config
    try {
      const docRef = doc(db, 'system_config', 'devify_config');
      await setDoc(docRef, {
        apiUrl: cleanUrl,
        apiKey: cleanKey,
        webhookSecret: cleanSecret,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[ConfigAPI] Firestore write notice:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials saved to .env.local and Firestore successfully!',
      apiUrl: cleanUrl,
      apiKey: cleanKey,
      webhookSecret: cleanSecret,
    });
  } catch (error: any) {
    console.error('[ConfigAPI] Error saving config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
