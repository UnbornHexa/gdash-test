import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from './users.service';
import { LocationDataService } from './location-data.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly locationDataService: LocationDataService,
  ) {}

  @Get('setup/default-user')
  async createDefaultUser() {
    try {
      console.log('📥 Requisição recebida para criar usuário padrão');
      const result = await this.usersService.createDefaultUser();
      let message = 'Usuário padrão já existe';
      if (result.created) {
        message = 'Usuário padrão criado com sucesso';
      } else if (result.updated) {
        message = 'Usuário padrão atualizado (senha resetada e/ou reativado)';
      }
      return { 
        success: true,
        message,
        email: result.email,
        created: result.created,
        updated: result.updated
      };
    } catch (error: any) {
      console.error('❌ Erro no controller:', error);
      return {
        success: false,
        message: 'Erro ao criar usuário padrão',
        error: error?.message || 'Erro desconhecido',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      };
    }
  }

  @Get('setup/diagnose')
  async diagnoseDefaultUser(@Res() res: Response) {
    try {
      const result = await Promise.race([
        this.usersService.diagnoseDefaultUser(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Erro desconhecido',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
    }
  }

  @Get('setup/test-connection')
  async testConnection(@Res() res: Response) {
    try {
      console.log('🔍 Testando conexão com MongoDB...');
      const testResult = await Promise.race([
        this.usersService.testMongoConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao conectar com MongoDB')), 3000)
        )
      ]);
      return res.json({ success: true, ...testResult });
    } catch (error: any) {
      console.error('❌ Erro ao testar conexão:', error?.message);
      return res.status(500).json({
        success: false,
        error: error?.message || 'Erro ao conectar com MongoDB',
      });
    }
  }

  @Get('setup/ping')
  async ping(@Res() res: Response) {
    // Endpoint simples que não acessa o banco, apenas testa se o servidor está respondendo
    return res.json({ 
      success: true, 
      message: 'Servidor está respondendo',
      timestamp: new Date().toISOString()
    });
  }

  @Post('setup/reset-default-user')
  async resetDefaultUser(@Res() res: Response) {
    try {
      console.log('📥 Requisição recebida para RESETAR usuário padrão');
      
      // Define timeout de 10 segundos
      const timeout = setTimeout(() => {
        console.error('❌ Timeout ao resetar usuário padrão');
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Timeout ao processar requisição',
          });
        }
      }, 10000);
      
      const result = await this.usersService.resetDefaultUser();
      clearTimeout(timeout);
      
      if (!res.headersSent) {
        return res.status(200).json({ 
          success: true,
          message: 'Usuário padrão resetado com sucesso',
          email: result.email,
        });
      }
    } catch (error: any) {
      console.error('❌ Erro no controller:', error);
      console.error('❌ Stack:', error?.stack);
      
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao resetar usuário padrão',
          error: error?.message || 'Erro desconhecido',
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
      }
    }
  }

  @Get('countries')
  async getCountries() {
    return this.locationDataService.getCountries();
  }

  @Get('states/:countryCode')
  async getStates(@Param('countryCode') countryCode: string) {
    return this.locationDataService.getStates(countryCode);
  }

  @Get('cities/:countryCode/:stateCode')
  async getCities(
    @Param('countryCode') countryCode: string,
    @Param('stateCode') stateCode: string,
  ) {
    return this.locationDataService.getCities(countryCode, stateCode);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('with-locations')
  async findAllWithLocations() {
    // Endpoint público para o coletor Python buscar usuários com localizações
    // Não requer autenticação para facilitar integração
    return this.usersService.findAllWithLocations();
  }

  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.usersService.findOne(req.user.userId);
  }

  @Post('profile/location')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateLocation(@Request() req: any, @Body() locationDto: UpdateLocationDto) {
    return this.usersService.updateLocation(req.user.userId, locationDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
