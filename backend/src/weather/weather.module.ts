import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { InsightsService } from './insights.service';
import { WeatherSchedulerService } from './weather-scheduler.service';
import { WeatherLog, WeatherLogSchema } from './schemas/weather-log.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WeatherLog.name, schema: WeatherLogSchema }]),
    UsersModule,
  ],
  controllers: [WeatherController],
  providers: [WeatherService, InsightsService, WeatherSchedulerService],
  exports: [WeatherService],
})
export class WeatherModule {}
