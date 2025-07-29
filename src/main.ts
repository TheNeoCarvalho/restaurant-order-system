import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { setupSwagger } from './common/config/swagger.config';
import { createLogger } from './common/config/logger.config';

async function bootstrap() {
  const customLogger = createLogger();
  const app = await NestFactory.create(AppModule, {
    logger: customLogger || undefined,
  });
  const logger = new Logger('Bootstrap');

  app.enableCors();
  app.setGlobalPrefix('api');
  // Global validation pipe will be configured in CommonModule

  // Setup Swagger documentation
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Swagger documentation available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();