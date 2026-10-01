import { DatabaseLoader, isSafeUrl } from './database.loader';

describe('DatabaseLoader Security', () => {
  it('blocks dangerous URLs and SSRF targets', () => {
    // SSRF e loopback
    expect(isSafeUrl('http://127.0.0.1:8080/stream', true)).toBe(false);
    expect(isSafeUrl('http://localhost/stream', true)).toBe(false);
    expect(isSafeUrl('http://192.168.1.1/stream', true)).toBe(false);
    expect(isSafeUrl('http://10.0.0.1/stream', true)).toBe(false);
    expect(isSafeUrl('http://169.254.169.254/latest/meta-data', true)).toBe(false);

    // Credenciais embutidas
    expect(isSafeUrl('https://admin:password@streaming.com/live', false)).toBe(false);

    // Esquemas proibidos
    expect(isSafeUrl('javascript:alert(1)', true)).toBe(false);
    expect(isSafeUrl('data:text/html,<html>', true)).toBe(false);
    expect(isSafeUrl('file:///etc/passwd', true)).toBe(false);

    // URL segura valida
    expect(isSafeUrl('https://server12.srvsh.com.br:8074/stream', false)).toBe(true);
  });

  it('rejects path traversal in RADIOS_DB_PATH', () => {
    process.env.RADIOS_DB_PATH = '../../../../etc/passwd';
    expect(() => {
      DatabaseLoader.resolveDatabasePath();
    }).toThrow('tentativa de path traversal detectada');
    delete process.env.RADIOS_DB_PATH;
  });

  it('loads and freezes the catalog in memory', () => {
    DatabaseLoader.resetCache();
    const radios = DatabaseLoader.loadRadios();
    expect(Array.isArray(radios)).toBe(true);
    expect(radios.length).toBe(211);
    expect(Object.isFrozen(radios)).toBe(true);
  });
});
