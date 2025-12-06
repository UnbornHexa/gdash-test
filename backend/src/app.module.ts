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
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://admin:admin123@mongodb:27017/weather_db?authSource=admin',
      {
        serverSelectionTimeoutMS: 2000, // 2 segundos apenas
        socketTimeoutMS: 20000,
        connectTimeoutMS: 3000, // 3 segundos
        maxPoolSize: 3,
        retryWrites: false, // Desabilita retry para não travar
        retryReads: false,
        bufferCommands: true,
        autoIndex: false,
        // Não espera conexão para iniciar
        directConnection: false,
      }
    ),
    WeatherModule,
    UsersModule,
    AuthModule,
    PokemonModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
