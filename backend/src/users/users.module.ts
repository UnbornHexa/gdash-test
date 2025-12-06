import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {
  // Removido OnApplicationBootstrap completamente para evitar travamentos
  // O usuário padrão deve ser criado manualmente via endpoint:
  // GET /api/users/setup/default-user ou POST /api/users/setup/reset-default-user
}
