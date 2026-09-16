import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from './infrastructure/http/http.module';
import { throttleOptions } from './infrastructure/http/guards/throttle.config';
import { typeormOptions } from './infrastructure/database/typeorm/typeorm-options';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: typeormOptions }),
    ThrottlerModule.forRoot(throttleOptions()),
    HttpModule,
  ],
})
export class AppModule {}
