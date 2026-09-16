import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { loadEnvironment } from './infrastructure/config/environment';
import { traceIdMiddleware } from './infrastructure/http/filters/trace-id.middleware';
import { setupSwagger } from './infrastructure/http/swagger';

async function bootstrap() {
  const environment = loadEnvironment();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'X-Kuri-Role'],
  });
  app.use(json({ limit: '256kb', strict: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(traceIdMiddleware);
  setupSwagger(app);
  await app.listen(environment.port);
}
void bootstrap();
