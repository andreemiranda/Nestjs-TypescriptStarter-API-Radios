import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeyService } from './common/services/api-key.service';
import { AuthBruteForceService } from './common/services/auth-brute-force.service';

describe('AppController', () => {
  let app: TestingModule;
  let appController: AppController;

  beforeAll(async () => {
    process.env.API_KEY =
      '6addf0e784c83b88f76d0d97a3a34bf7cb77d88145b9d37f4eea747d81e1a97d';

    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, ApiKeyService, AuthBruteForceService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('should return minimal public health status ok without leaking details', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
      expect((result as Record<string, unknown>)['uptime']).toBeUndefined();
    });
  });

  describe('getDetailedHealth', () => {
    it('should return system metrics when authorized', () => {
      const result = appController.getDetailedHealth();
      expect(result.status).toBe('ok');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.catalogSize).toBe(211);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getApiInfo', () => {
    it('should return API metadata with documentation link and auth type', () => {
      const result = appController.getApiInfo();
      expect(result['name']).toBe('RadiosWave API');
      expect(result['documentation']).toBe('/docs');
      expect(result['authentication']).toBeDefined();
    });
  });

  describe('getSecurityTxt and getRobotsTxt', () => {
    it('should return RFC 9116 security text with contact email', () => {
      const result = appController.getSecurityTxt();
      expect(result).toContain('Contact: mailto:legislativemunicipal@gmail.com');
      expect(result).toContain('Expires:');
    });

    it('should return robots.txt with disallow rules', () => {
      const result = appController.getRobotsTxt();
      expect(result).toContain('User-agent: *');
      expect(result).toContain('Disallow: /api/radios/*');
    });
  });
});
