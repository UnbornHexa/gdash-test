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

  async createDefaultUser(): Promise<{ created: boolean; email: string }> {
    try {
      const defaultEmail = (process.env.DEFAULT_USER_EMAIL || 'admin@example.com').toLowerCase().trim();
      const defaultPassword = process.env.DEFAULT_USER_PASSWORD || '123456';

      console.log(`🔍 Verificando/criando usuário padrão: ${defaultEmail}`);

      // Verifica se o modelo está disponível
      if (!this.userModel) {
        throw new Error('Modelo de usuário não está disponível - MongoDB pode não estar conectado');
      }

      console.log(`🔍 Buscando usuário existente...`);
      const existingUser = await this.userModel.findOne({ email: defaultEmail }).exec();
      if (existingUser) {
        console.log(`✅ Usuário padrão já existe: ${defaultEmail}`);
        return { created: false, email: defaultEmail };
      }

      console.log(`🔨 Criando novo usuário padrão...`);
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      const newUser = await this.userModel.create({
        email: defaultEmail,
        password: hashedPassword,
        name: 'Usuário Administrador',
        isActive: true,
      });

      console.log(`✅ Usuário padrão criado com sucesso: ${defaultEmail} (ID: ${newUser._id})`);
      return { created: true, email: defaultEmail };
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
