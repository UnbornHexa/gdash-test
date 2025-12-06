import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { WeatherLog } from './schemas/weather-log.schema';
import { CreateWeatherLogDto } from './dto/create-weather-log.dto';
import { QueryWeatherLogsDto } from './dto/query-weather-logs.dto';
import { FetchWeatherDto } from './dto/fetch-weather.dto';
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

  async generateInsights(limit: number = 50, currentWeather?: any) {
    const recentLogs = await this.weatherLogModel
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();

    // Se dados atuais foram fornecidos, usa eles como o mais recente
    // Caso contrário, usa o último log do banco
    let latestLog: any = recentLogs[0];
    
    if (currentWeather) {
      if (recentLogs.length > 0) {
        // Compara timestamps para ver qual é mais recente
        const currentTimestamp = new Date(currentWeather.timestamp).getTime();
        const latestLogTimestamp = new Date(recentLogs[0].timestamp).getTime();
        
        // Se os dados atuais são mais recentes, cria um objeto simples com os dados atuais
        // mas mantém a estrutura do log mais recente para compatibilidade
        if (currentTimestamp > latestLogTimestamp) {
          // Cria um objeto simples que será usado apenas para insights
          // Não precisa ser uma instância de WeatherLog do Mongoose
          const baseLog = recentLogs[0].toObject ? recentLogs[0].toObject() : recentLogs[0];
          latestLog = {
            ...baseLog,
            timestamp: currentWeather.timestamp,
            current: currentWeather.current,
          };
        }
      } else {
        // Se não há logs no banco, cria um objeto simples com os dados atuais
        latestLog = {
          timestamp: currentWeather.timestamp,
          location: currentWeather.location,
          current: currentWeather.current,
          forecast: currentWeather.forecast,
        };
      }
    }

    return this.insightsService.generateInsights(recentLogs, latestLog);
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
    return Buffer.from(buffer);
  }

  async remove(id: string): Promise<void> {
    await this.weatherLogModel.findByIdAndDelete(id).exec();
  }

  async fetchCurrentWeather(latitude: number, longitude: number) {
    try {
      const weatherApiUrl = 'https://api.open-meteo.com/v1/forecast';
      
      const params = {
        latitude,
        longitude,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'wind_speed_10m',
          'weather_code',
          'precipitation',
        ],
        hourly: [
          'temperature_2m',
          'relative_humidity_2m',
          'wind_speed_10m',
          'weather_code',
          'precipitation_probability',
        ],
        timezone: 'America/Sao_Paulo',
      };

      const response = await axios.get(weatherApiUrl, { params, timeout: 10000 });
      const data = response.data;

      // Mapeia código meteorológico para condição
      const weatherCodes: { [key: number]: string } = {
        0: 'clear',
        1: 'mainly_clear',
        2: 'partly_cloudy',
        3: 'overcast',
        45: 'foggy',
        48: 'depositing_rime_fog',
        51: 'light_drizzle',
        53: 'moderate_drizzle',
        55: 'dense_drizzle',
        56: 'light_freezing_drizzle',
        57: 'dense_freezing_drizzle',
        61: 'slight_rain',
        63: 'moderate_rain',
        65: 'heavy_rain',
        66: 'light_freezing_rain',
        67: 'heavy_freezing_rain',
        71: 'slight_snow',
        73: 'moderate_snow',
        75: 'heavy_snow',
        77: 'snow_grains',
        80: 'slight_rain_showers',
        81: 'moderate_rain_showers',
        82: 'violent_rain_showers',
        85: 'slight_snow_showers',
        86: 'heavy_snow_showers',
        95: 'thunderstorm',
        96: 'thunderstorm_with_slight_hail',
        99: 'thunderstorm_with_heavy_hail',
      };

      const current = data.current || {};
      const weatherCode = current.weather_code || 0;

      return {
        timestamp: new Date().toISOString(),
        location: {
          latitude,
          longitude,
        },
        current: {
          temperature: current.temperature_2m || null,
          humidity: current.relative_humidity_2m || null,
          windSpeed: current.wind_speed_10m || null,
          weatherCode: weatherCode,
          condition: weatherCodes[weatherCode] || 'unknown',
          precipitation: current.precipitation || 0,
        },
        forecast: data.hourly
          ? {
              time: data.hourly.time?.slice(0, 24) || [],
              temperature: data.hourly.temperature_2m?.slice(0, 24) || [],
              humidity: data.hourly.relative_humidity_2m?.slice(0, 24) || [],
              windSpeed: data.hourly.wind_speed_10m?.slice(0, 24) || [],
              weatherCode: data.hourly.weather_code?.slice(0, 24) || [],
              precipitationProbability: data.hourly.precipitation_probability?.slice(0, 24) || [],
            }
          : undefined,
      };
    } catch (error: any) {
      console.error('Erro ao buscar dados meteorológicos:', error);
      throw new HttpException(
        'Erro ao buscar dados meteorológicos da API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<{ city: string; state: string; country: string } | null> {
    try {
      // Usa Nominatim (OpenStreetMap) para geocodificação reversa
      const nominatimUrl = 'https://nominatim.openstreetmap.org/reverse';
      const params = {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
        'accept-language': 'pt-BR,pt,en',
      };

      const response = await axios.get(nominatimUrl, {
        params,
        timeout: 10000,
        headers: {
          'User-Agent': 'WeatherApp/1.0', // Nominatim requer User-Agent
        },
      });

      const data = response.data;
      if (!data || !data.address) {
        return null;
      }

      const address = data.address;
      
      // Extrai cidade, estado e país
      const city = address.city || address.town || address.village || address.municipality || address.county || 'Localização desconhecida';
      const state = address.state || address.region || address.province || '';
      const country = address.country || '';

      return { city, state, country };
    } catch (error: any) {
      console.error('Erro ao fazer geocodificação reversa:', error);
      return null;
    }
  }
}
