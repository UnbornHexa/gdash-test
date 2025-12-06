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
      process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://admin:admin123@mongodb:27017/weather_db?authSource=admin',
      {
        serverSelectionTimeoutMS: 5000, // 5 segundos para Railway
        socketTimeoutMS: 20000,
        connectTimeoutMS: 5000, // 5 segundos para Railway
        maxPoolSize: 10,
        retryWrites: true, // Habilita retry para produção
        retryReads: true,
        bufferCommands: true,
        autoIndex: false,
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
