import { Module } from '@nestjs/common';
import { RadiosService } from './radios.service';
import { RadiosController } from './radios.controller';

@Module({
  controllers: [RadiosController],
  providers: [RadiosService],
})
export class RadiosModule {}
