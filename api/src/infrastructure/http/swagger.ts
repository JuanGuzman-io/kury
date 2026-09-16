import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  if (process.env.NODE_ENV === 'production') return;
  const config = new DocumentBuilder()
    .setTitle('Kuri Operations API')
    .setDescription('Documentación local de las operaciones de Kuri Delivery')
    .setVersion('1.0.0')
    .addApiKey(
      { type: 'apiKey', name: 'X-Kuri-Role', in: 'header' },
      'simulatedRole',
    )
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}
