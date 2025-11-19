import { Module, OnApplicationBootstrap } from '@nestjs/common';
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
export class UsersModule implements OnApplicationBootstrap {
  constructor(private usersService: UsersService) {}

  async onApplicationBootstrap() {
    // Aguarda um pouco para garantir que o MongoDB está pronto
    // Usa uma Promise para evitar problemas com setTimeout
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    try {
      // Cria usuário padrão após a aplicação estar totalmente inicializada
      await this.usersService.createDefaultUser();
    } catch (error) {
      console.error('Erro na inicialização do módulo de usuários:', error);
    }
  }
}
