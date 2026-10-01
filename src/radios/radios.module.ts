import { Module } from '@nestjs/common';
import { RadiosService } from './radios.service';
import { RadiosController } from './radios.controller';
import { ApiKeyService } from '../common/services/api-key.service';
import { AuthBruteForceService } from '../common/services/auth-brute-force.service';

@Module({
  controllers: [RadiosController],
  providers: [RadiosService, ApiKeyService, AuthBruteForceService],
  exports: [RadiosService],
})
export class RadiosModule {}
