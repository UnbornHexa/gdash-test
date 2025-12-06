import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { GeocodingService } from './geocoding.service';
import { LocationDataService } from './location-data.service';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ConfigModule, // ConfigModule já é global, mas explicitamos para clareza
  ],
  controllers: [UsersController],
  providers: [UsersService, GeocodingService, LocationDataService],
  exports: [UsersService, LocationDataService],
})
export class UsersModule {
  // Removido OnApplicationBootstrap completamente para evitar travamentos
  // O usuário padrão deve ser criado manualmente via endpoint:
  // GET /api/users/setup/default-user ou POST /api/users/setup/reset-default-user
}
