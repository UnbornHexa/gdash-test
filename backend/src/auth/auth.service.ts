import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`🔍 Validando usuário: email="${normalizedEmail}"`);
    
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      console.log(`❌ Usuário não encontrado: "${normalizedEmail}"`);
      return null;
    }
    
    if (!user.isActive) {
      console.log(`❌ Usuário inativo: "${normalizedEmail}"`);
      return null;
    }

    console.log(`✅ Usuário encontrado e ativo: "${user.email}" (ID: ${user._id})`);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`❌ Senha inválida para usuário: "${user.email}"`);
      return null;
    }

    console.log(`✅ Credenciais válidas para: "${user.email}"`);
    const { password: _, ...result } = user.toObject();
    return result;
  }

  async login(loginDto: LoginDto) {
    try {
      // Normaliza o email (lowercase e trim) antes de validar
      const normalizedEmail = loginDto.email?.toLowerCase().trim() || '';
      console.log(`🔐 Tentativa de login: email="${normalizedEmail}"`);
      
      if (!normalizedEmail || !loginDto.password) {
        console.log(`❌ Email ou senha não fornecidos`);
        throw new UnauthorizedException('Email e senha são obrigatórios');
      }

      // Valida usuário normalmente
      const user = await this.validateUser(normalizedEmail, loginDto.password);
      
      if (!user) {
        console.log(`❌ Credenciais inválidas para: "${normalizedEmail}"`);
        throw new UnauthorizedException('Credenciais inválidas');
      }

      console.log(`✅ Login autorizado para: ${user.email}`);
      const payload = { email: user.email, sub: user._id };
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error: any) {
      // Se já é uma UnauthorizedException, relança
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Para outros erros, loga e relança como erro genérico
      console.error('❌ Erro inesperado no login:', error?.message);
      console.error('❌ Stack:', error?.stack);
      throw new UnauthorizedException('Erro ao processar login. Tente novamente.');
    }
  }
}
