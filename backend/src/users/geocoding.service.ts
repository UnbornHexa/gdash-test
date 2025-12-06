import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org/search';

  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    if (!address || address.trim() === '') {
      return null;
    }

    try {
      this.logger.log(`Geocodificando endereço: ${address}`);
      
      const response = await axios.get(this.nominatimUrl, {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'WeatherApp/1.0', // Nominatim requer User-Agent
        },
        timeout: 10000, // 10 segundos
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const latitude = parseFloat(result.lat);
        const longitude = parseFloat(result.lon);

        if (isNaN(latitude) || isNaN(longitude)) {
          this.logger.warn(`Coordenadas inválidas para endereço: ${address}`);
          return null;
        }

        this.logger.log(`Endereço geocodificado com sucesso: ${address} -> (${latitude}, ${longitude})`);
        return { latitude, longitude };
      }

      this.logger.warn(`Nenhum resultado encontrado para o endereço: ${address}`);
      return null;
    } catch (error: any) {
      this.logger.error(`Erro ao geocodificar endereço ${address}: ${error.message}`);
      return null;
    }
  }
}
