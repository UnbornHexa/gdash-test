import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Delete,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { WeatherService } from './weather.service';
import { CreateWeatherLogDto } from './dto/create-weather-log.dto';
import { QueryWeatherLogsDto } from './dto/query-weather-logs.dto';
import { FetchWeatherDto } from './dto/fetch-weather.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Post('logs')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createWeatherLogDto: CreateWeatherLogDto) {
    return this.weatherService.create(createWeatherLogDto);
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: QueryWeatherLogsDto) {
    return this.weatherService.findAll(query);
  }

  @Get('logs/latest')
  @UseGuards(JwtAuthGuard)
  async getLatest() {
    return this.weatherService.getLatest();
  }

  @Get('logs/:id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.weatherService.findOne(id);
  }

  @Get('insights')
  @UseGuards(JwtAuthGuard)
  async getInsights(@Query('limit') limit?: string, @Query('latitude') latitude?: string, @Query('longitude') longitude?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    
    // Tenta buscar dados atuais se latitude e longitude forem fornecidos
    let currentWeather = null;
    let latNum: number | undefined;
    let lonNum: number | undefined;
    
    if (latitude && longitude) {
      latNum = parseFloat(latitude);
      lonNum = parseFloat(longitude);
      
      try {
        currentWeather = await this.weatherService.fetchCurrentWeather(
          latNum,
          lonNum
        );
      } catch (error) {
        // Se falhar, continua sem dados atuais
        console.warn('Não foi possível buscar dados atuais para insights:', error);
      }
    }
    
    // Passa latitude e longitude para filtrar logs pela localização do usuário
    return this.weatherService.generateInsights(limitNum, currentWeather, latNum, lonNum);
  }

  @Get('export/csv')
  @UseGuards(JwtAuthGuard)
  async exportCSV(@Res() res: Response) {
    const csv = await this.weatherService.exportToCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=weather-logs.csv');
    res.send(csv);
  }

  @Get('export/xlsx')
  @UseGuards(JwtAuthGuard)
  async exportXLSX(@Res() res: Response) {
    const buffer = await this.weatherService.exportToXLSX();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=weather-logs.xlsx');
    res.send(buffer);
  }

  @Delete('logs/:id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    await this.weatherService.remove(id);
    return { message: 'Registro meteorológico excluído com sucesso' };
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrentWeather(@Query() query: FetchWeatherDto) {
    try {
      // Busca dados atuais sem salvar (os dados são coletados pelo serviço Python)
      return await this.weatherService.fetchCurrentWeather(query.latitude, query.longitude, false);
    } catch (error: any) {
      // Se for uma HttpException, deixa propagar
      if (error instanceof HttpException) {
        throw error;
      }
      // Caso contrário, loga e lança um erro genérico
      console.error('Erro inesperado ao buscar dados meteorológicos:', error);
      throw new HttpException(
        'Erro ao buscar dados meteorológicos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('location')
  @UseGuards(JwtAuthGuard)
  async getLocation(@Query() query: FetchWeatherDto) {
    return this.weatherService.reverseGeocode(query.latitude, query.longitude);
  }
}
