import { Injectable } from '@nestjs/common';
import { WeatherLog } from './schemas/weather-log.schema';

@Injectable()
export class InsightsService {
  generateInsights(logs: WeatherLog[], latestLog?: any): any {
    if (logs.length === 0) {
      return {
        message: 'Nenhum dado meteorológico disponível',
        insights: [],
      };
    }

    // Usa o latestLog fornecido ou o primeiro do array (mais recente)
    const current = latestLog || logs[0];

    const temperatures = logs.map((log) => log.current.temperature);
    const humidities = logs.map((log) => log.current.humidity);
    const windSpeeds = logs.map((log) => log.current.windSpeed);
    const conditions = logs.map((log) => log.current.condition);

    // Calcula estatísticas
    const avgTemperature = this.calculateAverage(temperatures);
    const avgHumidity = this.calculateAverage(humidities);
    const avgWindSpeed = this.calculateAverage(windSpeeds);

    const maxTemperature = Math.max(...temperatures);
    const minTemperature = Math.min(...temperatures);

    // Tendência de temperatura
    const recentTemps = temperatures.slice(0, Math.min(10, temperatures.length));
    const olderTemps = temperatures.slice(Math.min(10, temperatures.length));
    const recentAvg = this.calculateAverage(recentTemps);
    const olderAvg = olderTemps.length > 0 ? this.calculateAverage(olderTemps) : recentAvg;
    const temperatureTrend = this.capitalizeFirst(
      recentAvg > olderAvg ? 'subindo' : recentAvg < olderAvg ? 'descendo' : 'estável'
    );

    // Índice de conforto (0-100)
    const comfortIndex = this.calculateComfortIndex(avgTemperature, avgHumidity, avgWindSpeed);

    // Classificação do clima
    const weatherClassification = this.classifyWeather(avgTemperature, avgHumidity, conditions);

    // Alertas
    const alerts = this.generateAlerts(logs, avgTemperature, avgHumidity, current);

    // Texto de resumo
    const summary = this.generateSummary(logs, avgTemperature, avgHumidity, temperatureTrend, current);

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
    // Cálculo do índice de conforto baseado em temperatura, umidade e vento
    let index = 100;

    // Penalidade de temperatura (faixa ideal: 18-25°C)
    if (temperature < 10 || temperature > 35) {
      index -= 40;
    } else if (temperature < 15 || temperature > 30) {
      index -= 20;
    } else if (temperature < 18 || temperature > 25) {
      index -= 10;
    }

    // Penalidade de umidade (faixa ideal: 40-60%)
    if (humidity < 20 || humidity > 80) {
      index -= 20;
    } else if (humidity < 30 || humidity > 70) {
      index -= 10;
    }

    // Penalidade de velocidade do vento (faixa ideal: 5-15 km/h)
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
    if (index >= 80) return 'Muito Confortável';
    if (index >= 60) return 'Confortável';
    if (index >= 40) return 'Moderado';
    if (index >= 20) return 'Desconfortável';
    return 'Muito Desconfortável';
  }

  private classifyWeather(temperature: number, humidity: number, conditions: string[]): string {
    const avgCondition = conditions[0] || 'unknown';
    const rainyConditions = ['light_drizzle', 'moderate_drizzle', 'dense_drizzle', 'slight_rain', 'moderate_rain', 'heavy_rain', 'thunderstorm'];
    
    if (rainyConditions.some((c) => conditions.includes(c))) {
      return 'Chuvoso';
    }
    if (temperature < 10) {
      return 'Frio';
    }
    if (temperature > 30) {
      return 'Quente';
    }
    if (temperature >= 20 && temperature <= 28 && humidity >= 40 && humidity <= 60) {
      return 'Agradável';
    }
    return 'Moderado';
  }

  private generateAlerts(logs: WeatherLog[], avgTemp: number, avgHumidity: number, latest: WeatherLog): string[] {
    const alerts: string[] = [];

    // Alerta de temperatura alta
    if (latest.current.temperature > 35) {
      alerts.push('Alerta de Alta Temperatura: Calor extremo detectado');
    } else if (latest.current.temperature > 30) {
      alerts.push('Aviso de Alta Temperatura: Condições quentes');
    }

    // Alerta de temperatura baixa
    if (latest.current.temperature < 5) {
      alerts.push('Alerta de Baixa Temperatura: Frio extremo detectado');
    } else if (latest.current.temperature < 10) {
      alerts.push('Aviso de Baixa Temperatura: Condições frias');
    }

    // Alerta de umidade alta
    if (latest.current.humidity > 80) {
      alerts.push('Aviso de Alta Umidade: Condições muito úmidas');
    }

    // Alerta de precipitação
    if (latest.current.precipitation > 5) {
      alerts.push('Alerta de Precipitação: Chuva forte esperada');
    }

    // Alerta de vento
    if (latest.current.windSpeed > 30) {
      alerts.push('Aviso de Vento Forte: Ventos fortes detectados');
    }

    return alerts;
  }

  private generateSummary(logs: WeatherLog[], avgTemp: number, avgHumidity: number, trend: string, latest: WeatherLog): string {
    const days = Math.ceil(logs.length / 24);
    
    // Separa cada seção em uma linha diferente usando ponto e vírgula como separador
    const items: string[] = [];
    
    items.push(`Resumo do clima dos últimos ${days} dia(s): Temperatura média ${avgTemp.toFixed(1)}°C com tendência ${trend}`);
    items.push(`Condições atuais: ${latest.current.temperature.toFixed(1)}°C, ${latest.current.humidity.toFixed(0)}% de umidade, ${latest.current.windSpeed.toFixed(1)} km/h de velocidade do vento`);
    items.push(`Classificação geral: ${this.classifyWeather(avgTemp, avgHumidity, logs.map(l => l.current.condition))}`);

    return items.join(' | ');
  }

  private capitalizeFirst(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
}
