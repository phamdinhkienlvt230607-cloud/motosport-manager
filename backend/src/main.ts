import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string[]>('CORS_ORIGINS', []),
  });

  await app.listen(config.get<number>('PORT', 3000), '0.0.0.0');
}

await bootstrap();
