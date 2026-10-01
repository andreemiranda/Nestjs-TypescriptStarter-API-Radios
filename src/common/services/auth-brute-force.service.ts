import { Injectable } from '@nestjs/common';

interface IpAttempt {
  failures: number;
  firstFailureTime: number;
  blockedUntil?: number;
}

@Injectable()
export class AuthBruteForceService {
  private readonly attempts = new Map<string, IpAttempt>();
  private readonly maxFailures: number;
  private readonly windowMs: number;

  constructor() {
    this.maxFailures = process.env.AUTH_FAIL_LIMIT
      ? parseInt(process.env.AUTH_FAIL_LIMIT, 10)
      : 10;
    const ttlSec = process.env.AUTH_FAIL_TTL_SEC
      ? parseInt(process.env.AUTH_FAIL_TTL_SEC, 10)
      : 300;
    this.windowMs = ttlSec * 1000;

    // Limpeza periodica a cada 2 minutos
    const interval = setInterval(() => this.cleanup(), 120000);
    if (interval.unref) {
      interval.unref();
    }
  }

  isBlocked(ip: string): { blocked: boolean; retryAfterSeconds?: number } {
    const record = this.attempts.get(ip);
    if (!record) {
      return { blocked: false };
    }

    const now = Date.now();

    // Se estiver bloqueado
    if (record.blockedUntil && record.blockedUntil > now) {
      const remainingSec = Math.ceil((record.blockedUntil - now) / 1000);
      return { blocked: true, retryAfterSeconds: Math.max(1, remainingSec) };
    }

    // Se a janela expirou, limpa
    if (now - record.firstFailureTime > this.windowMs) {
      this.attempts.delete(ip);
      return { blocked: false };
    }

    return { blocked: false };
  }

  recordFailure(ip: string): { blocked: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    let record = this.attempts.get(ip);

    if (!record || now - record.firstFailureTime > this.windowMs) {
      record = { failures: 1, firstFailureTime: now };
      this.attempts.set(ip, record);
      return { blocked: false };
    }

    record.failures += 1;
    if (record.failures >= this.maxFailures) {
      record.blockedUntil = now + this.windowMs;
      const retryAfterSeconds = Math.ceil(this.windowMs / 1000);
      return { blocked: true, retryAfterSeconds };
    }

    return { blocked: false };
  }

  recordSuccess(ip: string): void {
    this.attempts.delete(ip);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, record] of this.attempts.entries()) {
      if (
        (record.blockedUntil && record.blockedUntil < now) ||
        now - record.firstFailureTime > this.windowMs
      ) {
        this.attempts.delete(ip);
      }
    }
  }
}

export const authBruteForceService = new AuthBruteForceService();
