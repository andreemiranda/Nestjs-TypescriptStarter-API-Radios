import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getApiInfo', () => {
    it('should return API metadata with endpoints', () => {
      const appController = app.get(AppController);
      const result = appController.getApiInfo();
      expect(result['name']).toBe('RadiosWave API');
      expect(result['endpoints']).toBeDefined();
    });
  });
});
