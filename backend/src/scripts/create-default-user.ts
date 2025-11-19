/**
 * Script para criar usuário padrão
 * Execute com: npx ts-node src/scripts/create-default-user.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function createDefaultUser() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);
    
    console.log('🔧 Criando usuário padrão...');
    const result = await usersService.createDefaultUser();
    
    if (result.created) {
      console.log(`✅ Usuário padrão criado: ${result.email}`);
    } else {
      console.log(`ℹ️  Usuário padrão já existe: ${result.email}`);
    }
    
    await app.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erro ao criar usuário padrão:', error);
    process.exit(1);
  }
}

createDefaultUser();
