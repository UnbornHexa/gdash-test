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
  async findAll(@Query() query: QueryWeatherLogsDto, @Query('latitude') latitude?: string, @Query('longitude') longitude?: string) {
    // Se coordenadas forem fornecidas, garante dados históricos em background
    if (latitude && longitude) {
      try {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          // Garante dados históricos sem bloquear a resposta
          this.weatherService.ensureHistoricalData(lat, lon, 3).catch((error) => {
            console.error('Erro ao garantir dados históricos:', error);
          });
        }
      } catch (error) {
        // Ignora erros silenciosamente
      }
    }
    
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
  async getInsights(
    @Query('limit') limit?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    let currentWeather = null;
    
    // Se coordenadas forem fornecidas, busca dados atuais com forecast e garante dados históricos
    if (latitude && longitude) {
      try {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          // Garante que há dados históricos dos últimos 3 dias (em background, não bloqueia)
          this.weatherService.ensureHistoricalData(lat, lon, 3).catch((error) => {
            console.error('Erro ao garantir dados históricos:', error);
          });
          
          // Busca dados atuais com forecast
          currentWeather = await this.weatherService.fetchCurrentWeather(lat, lon);
        }
      } catch (error) {
        console.error('Erro ao buscar clima atual para insights:', error);
        // Continua mesmo se falhar
      }
    }
    
    return this.weatherService.generateInsights(limitNum, currentWeather);
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
    return this.weatherService.fetchCurrentWeather(query.latitude, query.longitude);
  }

  @Get('location')
  @UseGuards(JwtAuthGuard)
  async getLocation(@Query() query: FetchWeatherDto) {
    return this.weatherService.reverseGeocode(query.latitude, query.longitude);
  }
}
