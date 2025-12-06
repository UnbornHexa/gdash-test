import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    try {
      console.log('📥 Requisição de login recebida:', { email: loginDto.email });
      const result = await this.authService.login(loginDto);
      console.log('✅ Login bem-sucedido');
      return result;
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      console.error('❌ Stack:', error?.stack);
      // Re-lança o erro para que o NestJS trate corretamente
      throw error;
    }
  }
}
