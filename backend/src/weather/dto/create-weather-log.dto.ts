import { IsNotEmpty, IsNumber, IsString, IsObject, IsOptional, IsArray } from 'class-validator';

export class CreateWeatherLogDto {
  @IsNotEmpty()
  @IsString()
  timestamp: string;

  @IsNotEmpty()
  @IsObject()
  location: {
    latitude: number;
    longitude: number;
  };

  @IsNotEmpty()
  @IsObject()
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    condition: string;
    precipitation: number;
  };

  @IsOptional()
  @IsObject()
  forecast?: {
    time: string[];
    temperature: number[];
    humidity: number[];
    windSpeed: number[];
    weatherCode: number[];
    precipitationProbability: number[];
  };
}
