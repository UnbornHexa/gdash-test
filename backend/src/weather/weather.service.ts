import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WeatherLog } from './schemas/weather-log.schema';
import { CreateWeatherLogDto } from './dto/create-weather-log.dto';
import { QueryWeatherLogsDto } from './dto/query-weather-logs.dto';
import { InsightsService } from './insights.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class WeatherService {
  constructor(
    @InjectModel(WeatherLog.name) private weatherLogModel: Model<WeatherLog>,
    private insightsService: InsightsService,
  ) {}

  async create(createWeatherLogDto: CreateWeatherLogDto): Promise<WeatherLog> {
    const createdLog = new this.weatherLogModel(createWeatherLogDto);
    return createdLog.save();
  }

  async findAll(query: QueryWeatherLogsDto) {
    const { page = 1, limit = 10, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.weatherLogModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.weatherLogModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<WeatherLog> {
    return this.weatherLogModel.findById(id).exec();
  }

  async getLatest(): Promise<WeatherLog> {
    return this.weatherLogModel.findOne().sort({ timestamp: -1 }).exec();
  }

  async generateInsights(limit: number = 50) {
    const recentLogs = await this.weatherLogModel
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();

    return this.insightsService.generateInsights(recentLogs);
  }

  async exportToCSV(): Promise<string> {
    const logs = await this.weatherLogModel.find().sort({ timestamp: -1 }).exec();

    const headers = [
      'Timestamp',
      'Latitude',
      'Longitude',
      'Temperature (°C)',
      'Humidity (%)',
      'Wind Speed (km/h)',
      'Condition',
      'Precipitation (mm)',
    ];

    const rows = logs.map((log) => [
      log.timestamp,
      log.location.latitude,
      log.location.longitude,
      log.current.temperature,
      log.current.humidity,
      log.current.windSpeed,
      log.current.condition,
      log.current.precipitation,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  async exportToXLSX(): Promise<Buffer> {
    const logs = await this.weatherLogModel.find().sort({ timestamp: -1 }).exec();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Weather Logs');

    // Cabeçalhos
    worksheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 },
      { header: 'Temperature (°C)', key: 'temperature', width: 15 },
      { header: 'Humidity (%)', key: 'humidity', width: 12 },
      { header: 'Wind Speed (km/h)', key: 'windSpeed', width: 15 },
      { header: 'Condition', key: 'condition', width: 15 },
      { header: 'Precipitation (mm)', key: 'precipitation', width: 18 },
    ];

    // Linhas de dados
    logs.forEach((log) => {
      worksheet.addRow({
        timestamp: log.timestamp,
        latitude: log.location.latitude,
        longitude: log.location.longitude,
        temperature: log.current.temperature,
        humidity: log.current.humidity,
        windSpeed: log.current.windSpeed,
        condition: log.current.condition,
        precipitation: log.current.precipitation,
      });
    });

    // Estiliza linha de cabeçalho
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }

  async remove(id: string): Promise<void> {
    await this.weatherLogModel.findByIdAndDelete(id).exec();
  }
}
