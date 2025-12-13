import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const logger = new Logger('Bootstrap');

  // Security: Helmet for HTTP headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }),
  );

  // Serve static files from public folder (project root/public)
  app.useStaticAssets(join(__dirname, '..', '..', 'public'));

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Swagger/OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Banglish API')
    .setDescription(
      `## Banglish Backend API Documentation

### Features
- **Authentication**: JWT-based auth with Google/Facebook OAuth
- **User Profiles**: Complete user profile management
- **Real-time Chat**: Direct messages and group chat rooms
- **Voice/Video Calls**: 1:1 and group calls via Agora
- **Online Presence**: HTTP-based presence with heartbeat
- **Billing & Payments**: Call minutes, purchasing, admin controls

### WebSocket Namespace
- \`/chat\` - Chat messages, rooms, and call signaling

### Presence (HTTP)
Use \`/presence/online\`, \`/presence/heartbeat\`, \`/presence/offline\` endpoints

### Billing
- New users get free call minutes (configurable by admin)
- Users can purchase additional minutes via Stripe/SSLCommerz
- Admin can adjust user balances and set pricing

### Authentication
All endpoints (except auth and health) require a Bearer token:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`
`,
    )
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
    .addTag('Health', 'Health check endpoints for load balancers')
    .addTag('Auth', 'Authentication and user registration')
    .addTag('Users', 'User management (admin only)')
    .addTag('Profile', 'User profile management')
    .addTag('Chat', 'Chat rooms and direct messages')
    .addTag('Call', 'Voice/Video call management')
    .addTag('Presence', 'Online/offline status')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Banglish API Docs',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  // Global validation pipe with detailed error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert query params to proper types
      },
      stopAtFirstError: false, // Return all validation errors
      validationError: {
        target: false, // Don't expose target object
        value: false, // Don't expose value
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global response interceptor for consistent response format
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📚 API Docs available at: http://localhost:${port}/api/docs`);
  logger.log(`❤️ Health check available at: http://localhost:${port}/health`);
}

bootstrap();
