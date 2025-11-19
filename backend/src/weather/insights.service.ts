import { Injectable } from '@nestjs/common';
import { WeatherLog } from './schemas/weather-log.schema';

@Injectable()
export class InsightsService {
  generateInsights(logs: WeatherLog[]): any {
    if (logs.length === 0) {
      return {
        message: 'No weather data available',
        insights: [],
      };
    }

    const temperatures = logs.map((log) => log.current.temperature);
    const humidities = logs.map((log) => log.current.humidity);
    const windSpeeds = logs.map((log) => log.current.windSpeed);
    const conditions = logs.map((log) => log.current.condition);

    // Calculate statistics
    const avgTemperature = this.calculateAverage(temperatures);
    const avgHumidity = this.calculateAverage(humidities);
    const avgWindSpeed = this.calculateAverage(windSpeeds);

    const maxTemperature = Math.max(...temperatures);
    const minTemperature = Math.min(...temperatures);

    // Temperature trend
    const recentTemps = temperatures.slice(0, Math.min(10, temperatures.length));
    const olderTemps = temperatures.slice(Math.min(10, temperatures.length));
    const recentAvg = this.calculateAverage(recentTemps);
    const olderAvg = olderTemps.length > 0 ? this.calculateAverage(olderTemps) : recentAvg;
    const temperatureTrend = recentAvg > olderAvg ? 'rising' : recentAvg < olderAvg ? 'falling' : 'stable';

    // Comfort index (0-100)
    const comfortIndex = this.calculateComfortIndex(avgTemperature, avgHumidity, avgWindSpeed);

    // Weather classification
    const weatherClassification = this.classifyWeather(avgTemperature, avgHumidity, conditions);

    // Alerts
    const alerts = this.generateAlerts(logs, avgTemperature, avgHumidity);

    // Summary text
    const summary = this.generateSummary(logs, avgTemperature, avgHumidity, temperatureTrend);

    return {
      statistics: {
        averageTemperature: Number(avgTemperature.toFixed(2)),
        averageHumidity: Number(avgHumidity.toFixed(2)),
        averageWindSpeed: Number(avgWindSpeed.toFixed(2)),
        maxTemperature: Number(maxTemperature.toFixed(2)),
        minTemperature: Number(minTemperature.toFixed(2)),
        dataPoints: logs.length,
      },
      trends: {
        temperature: temperatureTrend,
        temperatureChange: Number((recentAvg - olderAvg).toFixed(2)),
      },
      comfort: {
        index: comfortIndex,
        level: this.getComfortLevel(comfortIndex),
      },
      classification: weatherClassification,
      alerts,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateComfortIndex(temperature: number, humidity: number, windSpeed: number): number {
    // Comfort index calculation based on temperature, humidity, and wind
    let index = 100;

    // Temperature penalty (ideal range: 18-25°C)
    if (temperature < 10 || temperature > 35) {
      index -= 40;
    } else if (temperature < 15 || temperature > 30) {
      index -= 20;
    } else if (temperature < 18 || temperature > 25) {
      index -= 10;
    }

    // Humidity penalty (ideal range: 40-60%)
    if (humidity < 20 || humidity > 80) {
      index -= 20;
    } else if (humidity < 30 || humidity > 70) {
      index -= 10;
    }

    // Wind speed penalty (ideal range: 5-15 km/h)
    if (windSpeed > 30) {
      index -= 15;
    } else if (windSpeed > 20) {
      index -= 10;
    } else if (windSpeed < 2) {
      index -= 5;
    }

    return Math.max(0, Math.min(100, index));
  }

  private getComfortLevel(index: number): string {
    if (index >= 80) return 'Very Comfortable';
    if (index >= 60) return 'Comfortable';
    if (index >= 40) return 'Moderate';
    if (index >= 20) return 'Uncomfortable';
    return 'Very Uncomfortable';
  }

  private classifyWeather(temperature: number, humidity: number, conditions: string[]): string {
    const avgCondition = conditions[0] || 'unknown';
    const rainyConditions = ['light_drizzle', 'moderate_drizzle', 'dense_drizzle', 'slight_rain', 'moderate_rain', 'heavy_rain', 'thunderstorm'];
    
    if (rainyConditions.some((c) => conditions.includes(c))) {
      return 'Rainy';
    }
    if (temperature < 10) {
      return 'Cold';
    }
    if (temperature > 30) {
      return 'Hot';
    }
    if (temperature >= 20 && temperature <= 28 && humidity >= 40 && humidity <= 60) {
      return 'Pleasant';
    }
    return 'Moderate';
  }

  private generateAlerts(logs: WeatherLog[], avgTemp: number, avgHumidity: number): string[] {
    const alerts: string[] = [];
    const latest = logs[0];

    // High temperature alert
    if (latest.current.temperature > 35) {
      alerts.push('High Temperature Alert: Extreme heat detected');
    } else if (latest.current.temperature > 30) {
      alerts.push('High Temperature Warning: Hot conditions');
    }

    // Low temperature alert
    if (latest.current.temperature < 5) {
      alerts.push('Low Temperature Alert: Extreme cold detected');
    } else if (latest.current.temperature < 10) {
      alerts.push('Low Temperature Warning: Cold conditions');
    }

    // High humidity alert
    if (latest.current.humidity > 80) {
      alerts.push('High Humidity Warning: Very humid conditions');
    }

    // Precipitation alert
    if (latest.current.precipitation > 5) {
      alerts.push('Precipitation Alert: Heavy rainfall expected');
    }

    // Wind alert
    if (latest.current.windSpeed > 30) {
      alerts.push('High Wind Warning: Strong winds detected');
    }

    return alerts;
  }

  private generateSummary(logs: WeatherLog[], avgTemp: number, avgHumidity: number, trend: string): string {
    const days = Math.ceil(logs.length / 24);
    const latest = logs[0];
    
    let summary = `Weather summary for the last ${days} day(s): `;
    summary += `Average temperature ${avgTemp.toFixed(1)}°C with ${trend} trend. `;
    summary += `Current conditions: ${latest.current.temperature.toFixed(1)}°C, `;
    summary += `${latest.current.humidity.toFixed(0)}% humidity, `;
    summary += `${latest.current.windSpeed.toFixed(1)} km/h wind speed. `;
    summary += `Overall classification: ${this.classifyWeather(avgTemp, avgHumidity, logs.map(l => l.current.condition))}.`;

    return summary;
  }
}
