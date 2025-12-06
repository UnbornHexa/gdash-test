import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userModel.findOne({ email: createUserDto.email }).exec();
    if (existingUser) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-password').exec();
  }

  async findAllWithLocations(): Promise<User[]> {
    // Retorna apenas usuários ativos com localização definida
    return this.userModel
      .find({ 
        isActive: true,
        location: { $exists: true, $ne: null }
      })
      .select('email name location')
      .exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.userModel.findOne({ email: normalizedEmail }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({ email: updateUserDto.email }).exec();
      if (existingUser) {
        throw new ConflictException('Já existe um usuário com este e-mail');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return user.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Usuário não encontrado');
    }
  }

  async updateLocation(userId: string, location: { latitude: number; longitude: number }): Promise<User> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    user.location = location;
    return user.save();
  }

  async resetDefaultUser(): Promise<{ email: string }> {
    const defaultEmail = (process.env.DEFAULT_USER_EMAIL || 'admin@example.com').toLowerCase().trim();
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || '123456';
    
    console.log(`🔄 [1/4] Iniciando reset do usuário padrão: ${defaultEmail}`);
    
    try {
      // Verifica conexão primeiro
      if (!this.userModel) {
        throw new Error('Modelo de usuário não está disponível');
      }
      
      console.log(`🔄 [2/4] Deletando usuário existente (se houver)...`);
      // Tenta deletar usuário existente (se houver) com timeout
      try {
        const deletePromise = this.userModel.deleteOne({ email: defaultEmail }).exec();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao deletar usuário')), 3000)
        );
        
        const deleted = await Promise.race([deletePromise, timeoutPromise]) as any;
        if (deleted?.deletedCount > 0) {
          console.log(`🗑️ Usuário existente deletado`);
        } else {
          console.log(`ℹ️ Nenhum usuário existente para deletar`);
        }
      } catch (err: any) {
        if (err?.message?.includes('Timeout')) {
          console.log(`⚠️ Timeout ao deletar (continuando mesmo assim)`);
        } else {
          console.log(`⚠️ Não foi possível deletar usuário existente: ${err?.message}`);
        }
      }
      
      console.log(`🔄 [3/4] Gerando hash da senha...`);
      // Faz hash da senha
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      console.log(`🔄 [4/4] Criando novo usuário...`);
      // Cria novo usuário com timeout
      // Localização de Guarujá para o admin
      const guarujaLocation = {
        latitude: -23.9931,
        longitude: -46.2564,
      };

      const createPromise = this.userModel.create({
        email: defaultEmail,
        password: hashedPassword,
        name: 'Usuário Administrador',
        isActive: true,
        location: guarujaLocation,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao criar usuário')), 5000)
      );
      
      const newUser = await Promise.race([createPromise, timeoutPromise]) as any;

      console.log(`✅ Usuário padrão criado: ${defaultEmail} (ID: ${newUser._id})`);
      return { email: defaultEmail };
    } catch (error: any) {
      console.error('❌ Erro ao resetar usuário padrão:', error?.message || error);
      
      // Se for erro de duplicata ou timeout, tenta atualizar
      if (error?.code === 11000 || error?.message?.includes('Timeout') || error?.message?.includes('E11000')) {
        console.log(`⚠️ Usuário já existe ou timeout, tentando atualizar...`);
        try {
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);
          const updatePromise = this.userModel.updateOne(
            { email: defaultEmail },
            { 
              password: hashedPassword,
              isActive: true,
              name: 'Usuário Administrador'
            }
          ).exec();
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout ao atualizar usuário')), 5000)
          );
          
          const updated = await Promise.race([updatePromise, timeoutPromise]) as any;
          console.log(`✅ Usuário atualizado`);
          return { email: defaultEmail };
        } catch (updateError: any) {
          console.error('❌ Erro ao atualizar usuário:', updateError?.message);
          throw new Error('Não foi possível criar ou atualizar usuário. Verifique a conexão com MongoDB.');
        }
      }
      throw error;
    }
  }

  async testMongoConnection(): Promise<any> {
    try {
      console.log('🔍 Testando conexão...');
      const count = await this.userModel.countDocuments().exec();
      console.log(`✅ Conexão OK. Total de usuários: ${count}`);
      return {
        connected: true,
        userCount: count,
        message: 'Conexão com MongoDB está funcionando'
      };
    } catch (error: any) {
      console.error('❌ Erro na conexão:', error?.message);
      return {
        connected: false,
        error: error?.message || 'Erro desconhecido',
        message: 'Erro ao conectar com MongoDB'
      };
    }
  }

  async diagnoseDefaultUser(): Promise<any> {
    const defaultEmail = (process.env.DEFAULT_USER_EMAIL || 'admin@example.com').toLowerCase().trim();
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || '123456';
    
    try {
      // Busca todos os usuários com email similar
      const allUsers = await this.userModel.find({}).exec();
      const similarUsers = allUsers.filter(u => 
        u.email.toLowerCase().trim() === defaultEmail || 
        u.email.toLowerCase().includes('admin')
      );
      
      // Busca exata
      const exactUser = await this.userModel.findOne({ email: defaultEmail }).exec();
      
      // Testa senha se usuário existir
      let passwordTest = null;
      if (exactUser) {
        passwordTest = await bcrypt.compare(defaultPassword, exactUser.password);
      }
      
      return {
        success: true,
        defaultEmail,
        defaultPassword: '***',
        exactUserFound: !!exactUser,
        exactUser: exactUser ? {
          id: exactUser._id,
          email: exactUser.email,
          isActive: exactUser.isActive,
          name: exactUser.name,
          passwordHash: exactUser.password.substring(0, 20) + '...',
          passwordValid: passwordTest,
        } : null,
        similarUsers: similarUsers.map(u => ({
          id: u._id,
          email: u.email,
          isActive: u.isActive,
        })),
        allUsersCount: allUsers.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Erro desconhecido',
      };
    }
  }

  async createDefaultUser(): Promise<{ created: boolean; email: string; updated: boolean }> {
    try {
      const defaultEmail = (process.env.DEFAULT_USER_EMAIL || 'admin@example.com').toLowerCase().trim();
      const defaultPassword = process.env.DEFAULT_USER_PASSWORD || '123456';

      console.log(`🔍 Verificando/criando usuário padrão: ${defaultEmail}`);

      // Verifica se o modelo está disponível
      if (!this.userModel) {
        throw new Error('Modelo de usuário não está disponível - MongoDB pode não estar conectado');
      }

      console.log(`🔍 Buscando usuário existente...`);
      
      // Tenta buscar com email normalizado
      let existingUser = await this.userModel.findOne({ email: defaultEmail }).exec();
      
      // Se não encontrou, tenta buscar sem normalização (caso o email no banco não esteja normalizado)
      if (!existingUser) {
        console.log(`⚠️ Usuário não encontrado com email normalizado, tentando busca alternativa...`);
        const allUsers = await this.userModel.find({}).exec();
        existingUser = allUsers.find(u => 
          u.email.toLowerCase().trim() === defaultEmail
        ) || null;
        
        if (existingUser) {
          console.log(`⚠️ Usuário encontrado com email não normalizado: "${existingUser.email}"`);
          // Normaliza o email no banco
          existingUser.email = defaultEmail;
          await existingUser.save();
          console.log(`✅ Email normalizado no banco de dados`);
        }
      }
      
      if (existingUser) {
        console.log(`✅ Usuário padrão já existe: ${defaultEmail}`);
        console.log(`📋 Status: ativo=${existingUser.isActive}, email="${existingUser.email}"`);
        
        // Localização de Guarujá para o admin
        const guarujaLocation = {
          latitude: -23.9931,
          longitude: -46.2564,
        };
        
        // Verifica se a senha está correta
        const isPasswordValid = await bcrypt.compare(defaultPassword, existingUser.password);
        console.log(`🔑 Teste de senha: ${isPasswordValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
        
        // Verifica se precisa atualizar localização
        const needsLocationUpdate = !existingUser.location || 
          existingUser.location.latitude !== guarujaLocation.latitude ||
          existingUser.location.longitude !== guarujaLocation.longitude;
        
        const needsUpdate = !existingUser.isActive || !isPasswordValid || needsLocationUpdate;
        
        if (needsUpdate) {
          console.log(`🔄 Atualizando usuário padrão (ativo: ${existingUser.isActive}, senha válida: ${isPasswordValid}, localização: ${needsLocationUpdate ? 'atualizar' : 'ok'})...`);
          
          // Atualiza senha se necessário
          if (!isPasswordValid) {
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            existingUser.password = hashedPassword;
            console.log(`🔑 Senha do usuário padrão foi resetada`);
          }
          
          // Garante que está ativo
          existingUser.isActive = true;
          // Garante que o email está normalizado
          existingUser.email = defaultEmail;
          // Garante que tem localização de Guarujá
          existingUser.location = guarujaLocation;
          await existingUser.save();
          
          console.log(`✅ Usuário padrão atualizado com sucesso: ${defaultEmail}`);
          return { created: false, email: defaultEmail, updated: true };
        }
        
        return { created: false, email: defaultEmail, updated: false };
      }

      console.log(`🔨 Criando novo usuário padrão...`);
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      // Localização de Guarujá para o admin
      const guarujaLocation = {
        latitude: -23.9931,
        longitude: -46.2564,
      };

      const newUser = await this.userModel.create({
        email: defaultEmail,
        password: hashedPassword,
        name: 'Usuário Administrador',
        isActive: true,
        location: guarujaLocation,
      });

      console.log(`✅ Usuário padrão criado com sucesso: ${defaultEmail} (ID: ${newUser._id})`);
      return { created: true, email: defaultEmail, updated: false };
    } catch (error: any) {
      console.error('❌ Erro ao criar usuário padrão:', error);
      console.error('❌ Tipo do erro:', error?.constructor?.name);
      console.error('❌ Mensagem:', error?.message);
      if (error?.stack) {
        console.error('❌ Stack trace:', error.stack);
      }
      throw error; // Relança o erro para que o controller possa tratá-lo
    }
  }
}
