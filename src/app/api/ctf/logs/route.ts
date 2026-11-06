import { NextRequest, NextResponse } from 'next/server';
import type { LogEntry } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const since = req.nextUrl.searchParams.get('since');
    const buffer: LogEntry[] = (globalThis as any).__ctfLogBuffer || [];
    if (since) {
      const sinceDate = new Date(since);
      const filtered = buffer.filter((e) => new Date(e.timestamp) > sinceDate);
      return NextResponse.json(filtered);
    }
    return NextResponse.json(buffer);
  } catch (e) {
    console.error('Erro ao buscar logs', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
