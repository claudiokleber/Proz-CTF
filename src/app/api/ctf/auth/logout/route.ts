import { NextResponse } from "next/server";
import { clearPlatformSessionCookie } from "@/lib/ctf-auth";

import { logActivity } from '@/lib/log';

export async function POST() {
  clearPlatformSessionCookie();
  logActivity({
    ip: '',
    method: 'POST',
    path: '/api/ctf/auth/logout',
    status: 200,
    extra: 'logout',
  });
  return NextResponse.json({ ok: true });
}
