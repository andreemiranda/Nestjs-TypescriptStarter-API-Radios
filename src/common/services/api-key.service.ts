import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { appLogger } from './logger.service';

export interface StoredApiKey {
  id: string;
  name: string;
  hash: Buffer;
  active: boolean;
  expiresAt?: number;
}

export interface AuthValidationResult {
  valid: boolean;
  keyId?: string;
  reason?:
    | 'MISSING_KEY'
    | 'INVALID_KEY'
    | 'EXPIRED_KEY'
    | 'INACTIVE_KEY'
    | 'QUERY_KEY_DISABLED';
}

interface ApiKeyJsonItem {
  id?: string | number;
  name?: string;
  key: string;
  active?: boolean;
  expiresAt?: string;
}

function calculateEntropy(str: string): number {
  if (!str) return 0;
  const freq = new Map<string, number>();
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

@Injectable()
export class ApiKeyService implements OnModuleInit {
  private keys: StoredApiKey[] = [];
  private readonly minLength = 16;
  private readonly minEntropy = 2.5;

  constructor() {
    this.loadKeysFromEnvironment();
  }

  onModuleInit() {
    this.loadKeysFromEnvironment();
  }

  loadKeysFromEnvironment() {
    const loaded: StoredApiKey[] = [];
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Tenta carregar do formato JSON estruturado: API_KEYS_JSON
    if (process.env.API_KEYS_JSON) {
      try {
        const parsed: unknown = JSON.parse(process.env.API_KEYS_JSON);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item === 'object' && 'key' in item) {
              const entry = item as ApiKeyJsonItem;
              if (typeof entry.key === 'string') {
                const keyId = entry.id
                  ? String(entry.id)
                  : `key_${loaded.length + 1}`;
                this.validateKeySecurity(entry.key, keyId, isProduction);
                const hash = crypto
                  .createHash('sha256')
                  .update(entry.key.trim())
                  .digest();
                loaded.push({
                  id: keyId,
                  name: entry.name ? String(entry.name) : 'API Client',
                  hash,
                  active: entry.active !== false,
                  expiresAt: entry.expiresAt
                    ? new Date(entry.expiresAt).getTime()
                    : undefined,
                });
              }
            }
          }
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Falha ao analisar JSON de chaves';
        appLogger.error(
          `Erro ao analisar API_KEYS_JSON: ${msg}`,
          undefined,
          'ApiKeyService',
        );
      }
    }

    // 2. Tenta carregar lista separada por virgula ou chave unica (API_KEYS / API_KEY)
    const envApiKey = process.env.API_KEY;
    if (envApiKey && !loaded.some((k) => k.id === 'default')) {
      const keysList = envApiKey
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      keysList.forEach((rawKey, idx) => {
        let keyId = `key_${idx + 1}`;
        let actualKey = rawKey;

        // Suporte a formato rotulo:chave
        if (rawKey.includes(':')) {
          const parts = rawKey.split(':');
          keyId = parts[0].trim();
          actualKey = parts.slice(1).join(':').trim();
        }

        this.validateKeySecurity(actualKey, keyId, isProduction);
        const hash = crypto.createHash('sha256').update(actualKey).digest();
        loaded.push({
          id: keyId,
          name: `Client ${keyId}`,
          hash,
          active: true,
        });
      });
    }

    // Fail-fast em producao caso nenhuma chave valida esteja configurada
    if (isProduction && loaded.length === 0) {
      throw new Error(
        'Falha de inicializacao: Nenhuma chave de API valida configurada para o ambiente de producao.',
      );
    }

    this.keys = loaded;
    appLogger.log(
      `ApiKeyService inicializado com ${this.keys.length} chave(s) configurada(s).`,
      'ApiKeyService',
    );
  }

  private validateKeySecurity(
    key: string,
    keyId: string,
    isProduction: boolean,
  ) {
    const trimmed = key.trim();
    if (trimmed.length < this.minLength) {
      const msg = `Chave ${keyId} possui comprimento insuficiente (${trimmed.length} caracteres; minimo exigido: ${this.minLength}).`;
      if (isProduction) {
        throw new Error(`Falha de seguranca em producao: ${msg}`);
      } else {
        appLogger.warn(msg, 'ApiKeyService');
      }
    }

    const entropy = calculateEntropy(trimmed);
    if (entropy < this.minEntropy) {
      const msg = `Chave ${keyId} possui baixa entropia (${entropy.toFixed(2)} bits/char; minimo recomendado: ${this.minEntropy}).`;
      if (isProduction) {
        throw new Error(`Falha de seguranca em producao: ${msg}`);
      } else {
        appLogger.warn(msg, 'ApiKeyService');
      }
    }
  }

  validateKey(providedKey: string): AuthValidationResult {
    if (this.keys.length === 0) {
      this.loadKeysFromEnvironment();
    }

    if (!providedKey || typeof providedKey !== 'string') {
      return { valid: false, reason: 'MISSING_KEY' };
    }

    const trimmed = providedKey.trim();
    if (trimmed.length === 0) {
      return { valid: false, reason: 'MISSING_KEY' };
    }

    // Sempre calcula o hash da chave fornecida
    const providedHash = crypto.createHash('sha256').update(trimmed).digest();
    const now = Date.now();

    for (const key of this.keys) {
      // Comparacao estrita em tempo constante para evitar ataques de temporizacao
      const matches = crypto.timingSafeEqual(key.hash, providedHash);
      if (matches) {
        if (!key.active) {
          return { valid: false, keyId: key.id, reason: 'INACTIVE_KEY' };
        }
        if (key.expiresAt && key.expiresAt < now) {
          return { valid: false, keyId: key.id, reason: 'EXPIRED_KEY' };
        }
        return { valid: true, keyId: key.id };
      }
    }

    return { valid: false, reason: 'INVALID_KEY' };
  }

  hasConfiguredKeys(): boolean {
    return this.keys.length > 0;
  }
}
