import { ApiKeyService } from './api-key.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  const testKey = '6addf0e784c83b88f76d0d97a3a34bf7cb77d88145b9d37f4eea747d81e1a97d';

  beforeEach(() => {
    process.env.API_KEY = testKey;
    delete process.env.API_KEYS_JSON;
    service = new ApiKeyService();
    service.loadKeysFromEnvironment();
  });

  it('validates a correct key using constant-time comparison', () => {
    const res = service.validateKey(testKey);
    expect(res.valid).toBe(true);
    expect(res.keyId).toBe('key_1');
  });

  it('rejects an incorrect key', () => {
    const res = service.validateKey('wrong-key-value-with-32-chars-long!');
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('INVALID_KEY');
  });

  it('rejects empty or missing key', () => {
    expect(service.validateKey('').valid).toBe(false);
    expect(service.validateKey(null as unknown as string).valid).toBe(false);
  });

  it('supports multi-keys with rotation window and expiration', () => {
    const expiredTime = new Date(Date.now() - 10000).toISOString();
    const activeFutureTime = new Date(Date.now() + 100000).toISOString();

    process.env.API_KEYS_JSON = JSON.stringify([
      {
        id: 'client-active',
        name: 'Client Active',
        key: 'active-key-with-sufficient-length-and-entropy-1234',
        expiresAt: activeFutureTime,
      },
      {
        id: 'client-expired',
        name: 'Client Expired',
        key: 'expired-key-with-sufficient-length-and-entropy-5678',
        expiresAt: expiredTime,
      },
      {
        id: 'client-inactive',
        name: 'Client Inactive',
        key: 'inactive-key-with-sufficient-length-and-entropy-9012',
        active: false,
      },
    ]);

    const multiService = new ApiKeyService();
    multiService.loadKeysFromEnvironment();

    // Chave ativa
    const resActive = multiService.validateKey('active-key-with-sufficient-length-and-entropy-1234');
    expect(resActive.valid).toBe(true);
    expect(resActive.keyId).toBe('client-active');

    // Chave expirada (fora da janela de transição)
    const resExpired = multiService.validateKey('expired-key-with-sufficient-length-and-entropy-5678');
    expect(resExpired.valid).toBe(false);
    expect(resExpired.reason).toBe('EXPIRED_KEY');

    // Chave inativa (revogada)
    const resInactive = multiService.validateKey('inactive-key-with-sufficient-length-and-entropy-9012');
    expect(resInactive.valid).toBe(false);
    expect(resInactive.reason).toBe('INACTIVE_KEY');
  });
});
