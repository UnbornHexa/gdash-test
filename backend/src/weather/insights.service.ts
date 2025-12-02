import { Injectable } from '@nestjs/common';
import { WeatherLog } from './schemas/weather-log.schema';

interface AlertCard {
  type: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

interface StatusCard {
  type: 'extreme_heat' | 'comfortable' | 'cold' | 'rainy' | 'windy' | 'normal';
  title: string;
  description: string;
  icon: string;
}

@Injectable()
export class InsightsService {
  generateInsights(logs: WeatherLog[], currentWeather?: any): any {
    if (logs.length === 0) {
      return {
        message: 'Nenhum dado meteorológico disponível',
        insights: [],
      };
    }

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

    // Alertas estruturados
    const alertCards = this.generateAlertCards(logs, currentWeather, avgTemperature, avgHumidity);

    // Cards de status
    const statusCards = this.generateStatusCards(logs, avgTemperature, avgHumidity, comfortIndex);

    // Texto explicativo em linguagem natural
    const explanatoryText = this.generateExplanatoryText(logs, currentWeather, avgTemperature, avgHumidity, temperatureTrend);

    // Texto de resumo
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
      alerts: alertCards.map(card => card.message), // Mantém compatibilidade com versão antiga
      alertCards, // Novos cards de alerta estruturados
      statusCards, // Cards de status
      explanatoryText, // Texto explicativo
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

  private generateAlerts(logs: WeatherLog[], avgTemp: number, avgHumidity: number): string[] {
    const alerts: string[] = [];
    const latest = logs[0];

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

  /**
   * Gera cards de alerta estruturados com tipo e severidade
   */
  private generateAlertCards(logs: WeatherLog[], currentWeather: any, avgTemp: number, avgHumidity: number): AlertCard[] {
    const alertCards: AlertCard[] = [];
    const latest = logs[0];

    // Analisa previsões se disponíveis
    if (currentWeather?.forecast) {
      const forecast = currentWeather.forecast;
      
      // Analisa probabilidade de chuva nas próximas horas
      if (forecast.precipitationProbability) {
        const next3Hours = forecast.precipitationProbability.slice(0, 3);
        const maxPrecipProb = Math.max(...next3Hours);
        
        if (maxPrecipProb > 70) {
          alertCards.push({
            type: 'warning',
            title: 'Alta Chance de Chuva',
            message: `Probabilidade de chuva nas próximas 3 horas: ${maxPrecipProb.toFixed(0)}%. Recomenda-se levar guarda-chuva.`,
            severity: 'high',
          });
        } else if (maxPrecipProb > 50) {
          alertCards.push({
            type: 'info',
            title: 'Possibilidade de Chuva',
            message: `Chance de precipitação nas próximas horas: ${maxPrecipProb.toFixed(0)}%.`,
            severity: 'medium',
          });
        }
      }

      // Analisa temperatura nas próximas horas
      if (forecast.temperature) {
        const next6Hours = forecast.temperature.slice(0, 6);
        const maxNextTemp = Math.max(...next6Hours);
        const minNextTemp = Math.min(...next6Hours);
        
        if (maxNextTemp > 35) {
          alertCards.push({
            type: 'danger',
            title: 'Calor Extremo Esperado',
            message: `Temperatura pode atingir até ${maxNextTemp.toFixed(1)}°C nas próximas 6 horas. Hidrate-se e evite exposição prolongada ao sol.`,
            severity: 'high',
          });
        } else if (minNextTemp < 10) {
          alertCards.push({
            type: 'warning',
            title: 'Temperatura Baixa',
            message: `Temperatura pode cair para ${minNextTemp.toFixed(1)}°C. Vista-se adequadamente.`,
            severity: 'medium',
          });
        }
      }
    }

    // Alertas baseados em condições atuais
    if (latest.current.temperature > 35) {
      alertCards.push({
        type: 'danger',
        title: 'Calor Extremo',
        message: `Temperatura atual de ${latest.current.temperature.toFixed(1)}°C representa risco à saúde. Mantenha-se hidratado e evite atividades ao ar livre.`,
        severity: 'high',
      });
    } else if (latest.current.temperature > 30) {
      alertCards.push({
        type: 'warning',
        title: 'Temperatura Alta',
        message: `Condições quentes (${latest.current.temperature.toFixed(1)}°C). Proteja-se do sol e mantenha-se hidratado.`,
        severity: 'medium',
      });
    }

    if (latest.current.temperature < 5) {
      alertCards.push({
        type: 'danger',
        title: 'Frio Extremo',
        message: `Temperatura muito baixa (${latest.current.temperature.toFixed(1)}°C). Proteja-se do frio intenso.`,
        severity: 'high',
      });
    } else if (latest.current.temperature < 10) {
      alertCards.push({
        type: 'warning',
        title: 'Temperatura Baixa',
        message: `Temperatura fria (${latest.current.temperature.toFixed(1)}°C). Vista-se adequadamente.`,
        severity: 'medium',
      });
    }

    if (latest.current.humidity > 80) {
      alertCards.push({
        type: 'info',
        title: 'Alta Umidade',
        message: `Umidade relativa muito alta (${latest.current.humidity.toFixed(0)}%). Pode causar desconforto.`,
        severity: 'low',
      });
    }

    if (latest.current.precipitation > 5) {
      alertCards.push({
        type: 'warning',
        title: 'Chuva Forte',
        message: `Precipitação intensa detectada (${latest.current.precipitation.toFixed(1)} mm). Cuidado ao dirigir.`,
        severity: 'medium',
      });
    }

    if (latest.current.windSpeed > 30) {
      alertCards.push({
        type: 'warning',
        title: 'Vento Forte',
        message: `Ventos fortes detectados (${latest.current.windSpeed.toFixed(1)} km/h). Cuidado com objetos soltos.`,
        severity: 'medium',
      });
    }

    return alertCards;
  }

  /**
   * Gera cards de status do clima
   */
  private generateStatusCards(logs: WeatherLog[], avgTemp: number, avgHumidity: number, comfortIndex: number): StatusCard[] {
    const statusCards: StatusCard[] = [];
    const latest = logs[0];
    const rainyConditions = ['light_drizzle', 'moderate_drizzle', 'dense_drizzle', 'slight_rain', 'moderate_rain', 'heavy_rain', 'thunderstorm', 'slight_rain_showers', 'moderate_rain_showers', 'violent_rain_showers'];

    // Determina status principal baseado nas condições
    if (latest.current.temperature > 35) {
      statusCards.push({
        type: 'extreme_heat',
        title: 'Calor Extremo',
        description: `Temperatura elevada de ${latest.current.temperature.toFixed(1)}°C. Mantenha-se hidratado e evite exposição prolongada.`,
        icon: '🔥',
      });
    } else if (latest.current.temperature < 10) {
      statusCards.push({
        type: 'cold',
        title: 'Clima Frio',
        description: `Temperatura baixa de ${latest.current.temperature.toFixed(1)}°C. Vista-se adequadamente para se manter aquecido.`,
        icon: '❄️',
      });
    } else if (latest.current.temperature >= 20 && latest.current.temperature <= 28 && avgHumidity >= 40 && avgHumidity <= 60) {
      statusCards.push({
        type: 'comfortable',
        title: 'Clima Agradável',
        description: `Condições climáticas ideais com temperatura de ${latest.current.temperature.toFixed(1)}°C e umidade de ${latest.current.humidity.toFixed(0)}%. Perfeito para atividades ao ar livre.`,
        icon: '☀️',
      });
    } else if (rainyConditions.includes(latest.current.condition)) {
      statusCards.push({
        type: 'rainy',
        title: 'Clima Chuvoso',
        description: `Chuva detectada. Precipitação atual: ${latest.current.precipitation.toFixed(1)} mm. Não esqueça o guarda-chuva.`,
        icon: '🌧️',
      });
    } else if (latest.current.windSpeed > 20) {
      statusCards.push({
        type: 'windy',
        title: 'Clima Ventoso',
        description: `Ventos moderados a fortes (${latest.current.windSpeed.toFixed(1)} km/h). Cuidado com objetos soltos.`,
        icon: '💨',
      });
    } else {
      statusCards.push({
        type: 'normal',
        title: 'Clima Normal',
        description: `Condições climáticas dentro do esperado. Temperatura: ${latest.current.temperature.toFixed(1)}°C, Umidade: ${latest.current.humidity.toFixed(0)}%.`,
        icon: '🌤️',
      });
    }

    return statusCards;
  }

  /**
   * Gera texto explicativo em linguagem natural baseado nas análises
   */
  private generateExplanatoryText(logs: WeatherLog[], currentWeather: any, avgTemp: number, avgHumidity: number, trend: string): string[] {
    const texts: string[] = [];
    const latest = logs[0];

    // Análise de previsões
    if (currentWeather?.forecast) {
      const forecast = currentWeather.forecast;
      
      // Analisa chuva nas próximas horas
      if (forecast.precipitationProbability && forecast.precipitationProbability.length > 0) {
        const next6Hours = forecast.precipitationProbability.slice(0, 6);
        const avgPrecipProb = this.calculateAverage(next6Hours);
        const maxPrecipProb = Math.max(...next6Hours);
        
        if (maxPrecipProb > 70) {
          texts.push(`Alta chance de chuva nas próximas ${next6Hours.length} horas, com probabilidade máxima de ${maxPrecipProb.toFixed(0)}%. Recomenda-se estar preparado para condições chuvosas.`);
        } else if (avgPrecipProb > 50) {
          texts.push(`Possibilidade de precipitação nas próximas horas, com chance média de ${avgPrecipProb.toFixed(0)}%. Mantenha o guarda-chuva por perto.`);
        }
      }

      // Analisa temperatura nas próximas horas
      if (forecast.temperature && forecast.temperature.length > 0) {
        const next6Hours = forecast.temperature.slice(0, 6);
        const tempChange = Math.max(...next6Hours) - latest.current.temperature;
        
        if (tempChange > 5) {
          texts.push(`Temperatura deve subir significativamente nas próximas 6 horas, podendo atingir até ${Math.max(...next6Hours).toFixed(1)}°C. Prepare-se para condições mais quentes.`);
        } else if (tempChange < -5) {
          texts.push(`Queda de temperatura esperada nas próximas horas, chegando a ${Math.min(...next6Hours).toFixed(1)}°C. Vista-se adequadamente.`);
        }
      }
    }

    // Análise de tendências
    if (trend.toLowerCase() === 'subindo') {
      const recentTemps = logs.slice(0, Math.min(5, logs.length)).map(l => l.current.temperature);
      const avgRecent = this.calculateAverage(recentTemps);
      texts.push(`Temperatura está em tendência de alta, com média recente de ${avgRecent.toFixed(1)}°C. O clima está ficando mais quente.`);
    } else if (trend.toLowerCase() === 'descendo') {
      const recentTemps = logs.slice(0, Math.min(5, logs.length)).map(l => l.current.temperature);
      const avgRecent = this.calculateAverage(recentTemps);
      texts.push(`Temperatura está em tendência de queda, com média recente de ${avgRecent.toFixed(1)}°C. O clima está ficando mais frio.`);
    }

    // Análise de conforto
    const comfortIndex = this.calculateComfortIndex(avgTemp, avgHumidity, latest.current.windSpeed);
    if (comfortIndex >= 80) {
      texts.push(`Condições climáticas muito agradáveis e confortáveis, ideais para atividades ao ar livre.`);
    } else if (comfortIndex < 40) {
      texts.push(`Condições climáticas desconfortáveis. Tome precauções ao realizar atividades ao ar livre.`);
    }

    // Análise de umidade
    if (avgHumidity > 70) {
      texts.push(`Alta umidade relativa do ar (${avgHumidity.toFixed(0)}%) pode causar sensação de abafamento.`);
    } else if (avgHumidity < 30) {
      texts.push(`Baixa umidade relativa do ar (${avgHumidity.toFixed(0)}%) pode causar ressecamento. Mantenha-se hidratado.`);
    }

    // Se não houver textos específicos, adiciona um genérico
    if (texts.length === 0) {
      texts.push(`Condições climáticas estáveis. Temperatura média de ${avgTemp.toFixed(1)}°C com tendência ${trend.toLowerCase()}.`);
    }

    return texts;
  }

  private generateSummary(logs: WeatherLog[], avgTemp: number, avgHumidity: number, trend: string): string {
    const days = Math.ceil(logs.length / 24);
    const latest = logs[0];
    
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
