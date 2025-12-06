import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class WeatherLog extends Document {
  @Prop({ required: true })
  timestamp: string;

  @Prop({
    type: {
      latitude: Number,
      longitude: Number,
    },
    required: true,
  })
  location: {
    latitude: number;
    longitude: number;
  };

  @Prop({
    type: {
      temperature: Number,
      humidity: Number,
      windSpeed: Number,
      weatherCode: Number,
      condition: String,
      precipitation: Number,
    },
    required: true,
  })
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    condition: string;
    precipitation: number;
  };

  @Prop({
    type: {
      time: [String],
      temperature: [Number],
      humidity: [Number],
      windSpeed: [Number],
      weatherCode: [Number],
      precipitationProbability: [Number],
    },
  })
  forecast?: {
    time: string[];
    temperature: number[];
    humidity: number[];
    windSpeed: number[];
    weatherCode: number[];
    precipitationProbability: number[];
  };

  @Prop({
    type: {
      time: [String],
      weatherCode: [Number],
      temperatureMax: [Number],
      temperatureMin: [Number],
      precipitationSum: [Number],
      precipitationProbabilityMax: [Number],
      windSpeedMax: [Number],
    },
  })
  dailyForecast?: {
    time: string[];
    weatherCode: number[];
    temperatureMax: number[];
    temperatureMin: number[];
    precipitationSum: number[];
    precipitationProbabilityMax: number[];
    windSpeedMax: number[];
  };
}

export const WeatherLogSchema = SchemaFactory.createForClass(WeatherLog);
WeatherLogSchema.index({ timestamp: -1 });
WeatherLogSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
