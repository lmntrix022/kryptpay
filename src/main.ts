import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { raw } from 'body-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { ValidationException } from './common/exceptions/boohpay.exception';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('v1', {
    exclude: ['/metrics', '/health', '/api'],
  });
  app.use('/v1/webhooks/stripe', raw({ type: 'application/json' }));
  app.enableCors();

  // Configuration Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('KryptPay API')
    .setDescription('KryptPay - Hybrid Payment Orchestration API. Une API unique pour router et orchestrer des paiements entre Moneroo, Stripe, et eBilling.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API Key for merchant authentication',
      },
      'api-key',
    )
    .addTag('Payments', 'Gestion des paiements')
    .addTag('Admin', 'Endpoints administrateurs (transactions, payouts, analytics)')
    .addTag('Webhooks', 'Réception des webhooks des fournisseurs')
    .addTag('Providers', 'Gestion des credentials et connectivité avec les fournisseurs')
    .addTag('Payouts', 'Gestion des paiements sortants')
    .addTag('Subscriptions', 'Gestion des abonnements récurrents')
    .addTag('Sandbox', 'Simulation et test des webhooks')
    .addTag('Filters', 'Filtres sauvegardés')
    .addTag('Notifications', 'Préférences et historique des notifications')
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.boohpay.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.reduce((acc, error) => {
          if (error.constraints) {
            acc[error.property] = Object.values(error.constraints);
          }
          return acc;
        }, {} as Record<string, string[]>);
        return new ValidationException('Validation failed', messages);
      },
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`KryptPay API listening on port ${port}`);
}

void bootstrap();
