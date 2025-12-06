import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    console.log('🚀 [1/6] Iniciando aplicação NestJS...');
    console.log('📋 [2/6] Variáveis de ambiente:');
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'definida' : 'não definida'}`);
    console.log(`   PORT: ${process.env.PORT || 3000}`);
    
    console.log('📋 [3/6] Criando aplicação NestJS...');
    // Cria a aplicação com logger mínimo para evitar problemas
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      abortOnError: false, // Não aborta em caso de erro
    });
    
    console.log('✅ [4/6] Aplicação NestJS criada com sucesso');

    console.log('📋 [5/6] Configurando middleware...');
    
    // Habilita CORS
    app.enableCors({
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    });

    // Pipe de validação global
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          const messages = errors.map((error) => {
            return Object.values(error.constraints || {}).join(', ');
          });
          return new BadRequestException({
            message: 'Dados inválidos',
            errors: messages,
          });
        },
      }),
    );

    // Tratamento global de exceções
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise);
      console.error('❌ Reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      console.error('❌ Stack:', error.stack);
    });

    // Prefixo global
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    console.log(`🌐 [6/6] Iniciando servidor na porta ${port}...`);
    await app.listen(port);
    
    console.log(`✅✅✅ Aplicação rodando com sucesso em: http://localhost:${port}`);
    console.log(`✅ Endpoint de health check: http://localhost:${port}/api/health`);
    console.log(`✅ Endpoint para criar usuário padrão: http://localhost:${port}/api/users/setup/default-user`);
    console.log(`✅ Endpoint para resetar usuário: http://localhost:${port}/api/users/setup/reset-default-user`);
  } catch (error: any) {
    console.error('❌ Erro ao iniciar aplicação:', error?.message || error);
    console.error('❌ Stack:', error?.stack);
    process.exit(1);
  }
}

bootstrap();
