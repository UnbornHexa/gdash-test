import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WeatherModule } from './weather/weather.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PokemonModule } from './pokemon/pokemon.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: () => {
        let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://admin:admin123@mongodb:27017/weather_db?authSource=admin';
        
        // Log da connection string (sem senha) para debug
        const uriForLog = mongoUri.replace(/:[^:@]+@/, ':****@');
        console.log(`📦 MongoDB URI: ${uriForLog}`);
        
        // Parse da URI para extrair informações e validar
        let parsedUri: URL;
        try {
          parsedUri = new URL(mongoUri);
          
          // Se a senha tem caracteres especiais não codificados, avisa
          const password = parsedUri.password;
          if (password && (password.includes('@') || password.includes('#') || password.includes('%') || password.includes('&'))) {
            console.warn('⚠️ Senha contém caracteres especiais. Certifique-se de que estão URL-encoded na connection string.');
            console.warn('⚠️ Exemplo: @ deve ser %40, # deve ser %23, % deve ser %25');
          }
          
          // Configurações base
          const options: any = {
            serverSelectionTimeoutMS: 30000, // 30 segundos para Railway
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000, // 30 segundos para Railway
            maxPoolSize: 10,
            retryWrites: true,
            retryReads: true,
            bufferCommands: true,
            autoIndex: false,
            directConnection: false,
          };
          
          // Se a URI já tem authSource, não adiciona novamente nas opções
          // Isso evita conflitos de autenticação
          if (!parsedUri.searchParams.has('authSource')) {
            options.authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';
          }
          
          // Para MongoDB Atlas (mongodb+srv://), não use directConnection
          if (mongoUri.startsWith('mongodb+srv://')) {
            options.directConnection = false;
          }
          
          console.log(`📦 MongoDB Options:`, JSON.stringify(options, null, 2));
          
          return {
            uri: mongoUri,
            ...options,
          };
        } catch (error) {
          console.error('❌ Erro ao parsear MONGODB_URI:', error);
          throw new Error('MONGODB_URI inválida');
        }
        
      },
    }),
    WeatherModule,
    UsersModule,
    AuthModule,
    PokemonModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
