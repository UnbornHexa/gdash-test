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
  async getInsights(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.weatherService.generateInsights(limitNum);
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
    return { message: 'Weather log deleted successfully' };
  }
}
