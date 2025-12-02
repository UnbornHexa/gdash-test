import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WeatherService } from './weather.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class WeatherSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(WeatherSchedulerService.name);

  constructor(
    private readonly weatherService: WeatherService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Atualiza dados históricos de todos os usuários a cada 6 horas
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleHistoricalDataUpdate() {
    this.logger.log('🔄 Iniciando atualização de dados históricos...');

    try {
      // Busca todos os usuários que têm localização definida
      const users = await this.usersService.findAll();
      const usersWithLocation = users.filter(
        (user) => user.location?.latitude && user.location?.longitude,
      );

      if (usersWithLocation.length === 0) {
        this.logger.warn('⚠️ Nenhum usuário com localização encontrado');
        return;
      }

      this.logger.log(`📍 Encontrados ${usersWithLocation.length} usuário(s) com localização`);

      // Processa cada usuário
      for (const user of usersWithLocation) {
        try {
          const { latitude, longitude } = user.location!;
          this.logger.log(
            `📊 Atualizando dados históricos para usuário ${user.email} (${latitude}, ${longitude})...`,
          );

          // Garante que há dados dos últimos 3 dias
          await this.weatherService.ensureHistoricalData(latitude, longitude, 3);
        } catch (error: any) {
          this.logger.error(
            `❌ Erro ao atualizar dados para usuário ${user.email}: ${error.message}`,
          );
        }
      }

      this.logger.log('✅ Atualização de dados históricos concluída');
    } catch (error: any) {
      this.logger.error(`❌ Erro na atualização de dados históricos: ${error.message}`);
    }
  }

  /**
   * Atualiza dados quando o serviço é iniciado (após um delay)
   */
  async onModuleInit() {
    // Aguarda 30 segundos após a inicialização para garantir que tudo está pronto
    setTimeout(async () => {
      this.logger.log('🚀 Executando inicialização de dados históricos...');
      await this.handleHistoricalDataUpdate();
    }, 30000);
  }
}

