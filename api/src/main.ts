import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { loadEnvironment } from './infrastructure/config/environment';
import { traceIdMiddleware } from './infrastructure/http/filters/trace-id.middleware';

async function bootstrap() {
  const environment = loadEnvironment();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '256kb', strict: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(traceIdMiddleware);
  await app.listen(environment.port);
}
void bootstrap();
