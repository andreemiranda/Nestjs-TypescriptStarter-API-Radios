import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RadiosModule } from './radios/radios.module';

@Module({
  imports: [RadiosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
