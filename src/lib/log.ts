import { NextApiRequest, NextApiResponse } from 'next';

export type LogEntry = {
  timestamp: string; // ISO string
  ip: string;
  method: string;
  path: string;
  status: number;
  user?: string; // email or name
  extra?: string;
};

const MAX_LOGS = 300;

/**
 * Push a log entry to the in‑memory buffer. The buffer lives on the global object so it is shared across all API routes within the same Node process.
 * This function is deliberately fire‑and‑forget: any error during logging is caught and only reported to console to avoid affecting the request.
 */
export function logActivity(entry: Omit<LogEntry, 'timestamp'>) {
  try {
    const buffer: LogEntry[] = (globalThis as any).__ctfLogBuffer || [];
    const newEntry: LogEntry = { timestamp: new Date().toISOString(), ...entry };
    buffer.push(newEntry);
    // keep only latest MAX_LOGS entries
    if (buffer.length > MAX_LOGS) {
      buffer.splice(0, buffer.length - MAX_LOGS);
    }
    (globalThis as any).__ctfLogBuffer = buffer;
  } catch (e) {
    console.error('Failed to log activity', e);
  }
}
