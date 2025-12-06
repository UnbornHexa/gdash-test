import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// Estados brasileiros (usado como fallback)
const BRAZIL_STATES = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
];

// Principais cidades por estado brasileiro (fallback)
const BRAZIL_CITIES: Record<string, string[]> = {
  'AC': ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira'],
  'AL': ['Maceió', 'Arapiraca', 'Palmeira dos Índios'],
  'AP': ['Macapá', 'Santana', 'Laranjal do Jari'],
  'AM': ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru'],
  'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Juazeiro'],
  'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral'],
  'DF': ['Brasília'],
  'ES': ['Vitória', 'Vila Velha', 'Cariacica', 'Serra', 'Cachoeiro de Itapemirim'],
  'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Águas Lindas de Goiás'],
  'MA': ['São Luís', 'Imperatriz', 'Caxias', 'Timon', 'Codó'],
  'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra'],
  'MS': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã'],
  'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Ribeirão das Neves'],
  'PA': ['Belém', 'Ananindeua', 'Marituba', 'Paragominas', 'Castanhal'],
  'PB': ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux'],
  'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'Foz do Iguaçu'],
  'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina'],
  'PI': ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Campo Maior'],
  'RJ': ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Campos dos Goytacazes'],
  'RN': ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba'],
  'RS': ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria'],
  'RO': ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal'],
  'RR': ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre', 'Pacaraima'],
  'SC': ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Criciúma', 'Chapecó'],
  'SP': ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'Ribeirão Preto', 'Sorocaba', 'Santos'],
  'SE': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'São Cristóvão'],
  'TO': ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins'],
};

// Mapeamento de códigos de estado brasileiro para códigos do IBGE
const STATE_TO_IBGE: Record<string, string> = {
  'AC': '12',
  'AL': '27',
  'AP': '16',
  'AM': '13',
  'BA': '29',
  'CE': '23',
  'DF': '53',
  'ES': '32',
  'GO': '52',
  'MA': '21',
  'MT': '51',
  'MS': '50',
  'MG': '31',
  'PA': '15',
  'PB': '25',
  'PR': '41',
  'PE': '26',
  'PI': '22',
  'RJ': '33',
  'RN': '24',
  'RS': '43',
  'RO': '11',
  'RR': '14',
  'SC': '42',
  'SP': '35',
  'SE': '28',
  'TO': '17',
};

@Injectable()
export class LocationDataService {
  private readonly logger = new Logger(LocationDataService.name);
  private readonly restCountriesApiUrl = 'https://restcountries.com/v3.1';
  private readonly countryStateCityApiUrl = 'https://api.countrystatecity.in/v1';
  private readonly ibgeApiUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Busca todos os países do mundo usando REST Countries API (gratuita, sem chave)
   * Fallback: lista estática limitada se a API falhar
   */
  async getCountries(): Promise<Array<{ code: string; name: string }>> {
    try {
      // Primeiro tenta CountryStateCity se tiver API key (tem mais países)
      const apiKey = this.configService.get<string>('COUNTRY_STATE_CITY_API_KEY');
      if (apiKey) {
        try {
          const response = await axios.get(
            `${this.countryStateCityApiUrl}/countries`,
            {
              headers: {
                'X-CSCAPI-KEY': apiKey,
                'Accept': 'application/json',
              },
              timeout: 8000,
            }
          );

          if (response.data && Array.isArray(response.data)) {
            const countries = response.data
              .map((country: any) => ({
                code: country.iso2,
                name: country.name,
              }))
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            
            this.logger.log(`Buscados ${countries.length} países da API CountryStateCity`);
            return countries;
          }
        } catch (error: any) {
          this.logger.warn(`Erro ao buscar países da CountryStateCity: ${error.message}, tentando REST Countries`);
        }
      }

      // Fallback: REST Countries API (gratuita, sem chave)
      const response = await axios.get(
        `${this.restCountriesApiUrl}/all?fields=name,cca2`,
        {
          timeout: 8000,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        const countries = response.data
          .map((country: any) => ({
            code: country.cca2, // ISO 3166-1 alpha-2 code
            name: country.name.common || country.name.official,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        
        this.logger.log(`Buscados ${countries.length} países da API REST Countries`);
        return countries;
      }

      this.logger.warn('APIs retornaram dados inválidos, usando fallback');
      return this.getCountriesFallback();
    } catch (error: any) {
      this.logger.error(`Erro ao buscar países: ${error.message}`);
      return this.getCountriesFallback();
    }
  }

  /**
   * Fallback: lista estática de países principais
   */
  private getCountriesFallback(): Array<{ code: string; name: string }> {
    return [
      { code: 'BR', name: 'Brasil' },
      { code: 'US', name: 'Estados Unidos' },
      { code: 'AR', name: 'Argentina' },
      { code: 'CL', name: 'Chile' },
      { code: 'CO', name: 'Colômbia' },
      { code: 'MX', name: 'México' },
      { code: 'PT', name: 'Portugal' },
      { code: 'ES', name: 'Espanha' },
      { code: 'FR', name: 'França' },
      { code: 'DE', name: 'Alemanha' },
      { code: 'IT', name: 'Itália' },
      { code: 'GB', name: 'Reino Unido' },
      { code: 'CA', name: 'Canadá' },
      { code: 'AU', name: 'Austrália' },
      { code: 'JP', name: 'Japão' },
      { code: 'CN', name: 'China' },
    ];
  }

  /**
   * Busca estados/províncias de um país
   * Para o Brasil, usa lista estática
   * Para outros países, tenta CountryStateCity API (se tiver key)
   */
  async getStates(countryCode: string): Promise<Array<{ code: string; name: string }>> {
    // Para o Brasil, usa lista estática
    if (countryCode === 'BR') {
      return BRAZIL_STATES;
    }

    try {
      // Tenta CountryStateCity API (se tiver API key)
      const apiKey = this.configService.get<string>('COUNTRY_STATE_CITY_API_KEY');
      if (!apiKey) {
        this.logger.warn(`COUNTRY_STATE_CITY_API_KEY não configurada. Para buscar estados de países além do Brasil, configure a API key. Obtenha em: https://countrystatecity.in/`);
        return [];
      }

      const response = await axios.get(
        `${this.countryStateCityApiUrl}/countries/${countryCode}/states`,
        {
          headers: {
            'X-CSCAPI-KEY': apiKey,
            'Accept': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const states = response.data
          .map((state: any) => ({
            code: state.iso2 || state.name,
            name: state.name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        
        this.logger.log(`Buscados ${states.length} estados/províncias para ${countryCode} via CountryStateCity`);
        return states;
      }

      this.logger.warn(`API CountryStateCity retornou dados vazios para estados de ${countryCode}`);
      return [];
    } catch (error: any) {
      // Se for erro 401 ou 403, significa problema com API key
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.logger.error(`API key inválida ou sem permissão. Verifique sua COUNTRY_STATE_CITY_API_KEY.`);
      } else {
        this.logger.error(`Erro ao buscar estados de ${countryCode}: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Busca cidades de um estado
   * Para o Brasil, usa IBGE (gratuita, completa)
   * Para outros países, tenta CountryStateCity API (se tiver key) ou Geonames
   */
  async getCities(countryCode: string, stateCode: string): Promise<string[]> {
    // Para o Brasil, prioriza IBGE (gratuito e tem todas as cidades)
    if (countryCode === 'BR' && stateCode) {
      return this.getBrazilCities(stateCode);
    }

    try {
      // Tenta CountryStateCity API primeiro (se tiver API key)
      const apiKey = this.configService.get<string>('COUNTRY_STATE_CITY_API_KEY');
      if (apiKey) {
        try {
          const response = await axios.get(
            `${this.countryStateCityApiUrl}/countries/${countryCode}/states/${stateCode}/cities`,
            {
              headers: {
                'X-CSCAPI-KEY': apiKey,
                'Accept': 'application/json',
              },
              timeout: 8000,
            }
          );

          if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            const cities = response.data
              .map((city: any) => city.name)
              .sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'));
            
            this.logger.log(`Buscadas ${cities.length} cidades para ${countryCode}/${stateCode} via CountryStateCity`);
            return cities;
          }
        } catch (error: any) {
          this.logger.warn(`Erro ao buscar cidades da CountryStateCity para ${countryCode}/${stateCode}: ${error.message}`);
        }
      }

      // Se tudo falhar, retorna array vazio
      this.logger.warn(`Não foi possível buscar cidades para ${countryCode}/${stateCode}`);
      return [];
    } catch (error: any) {
      // Se for erro 401 ou 403, significa problema com API key
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.logger.error(`API key inválida ou sem permissão. Verifique sua COUNTRY_STATE_CITY_API_KEY.`);
      } else {
        this.logger.error(`Erro ao buscar cidades de ${countryCode}/${stateCode}: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Busca todas as cidades brasileiras usando a API do IBGE (gratuita)
   */
  private async getBrazilCities(stateCode: string): Promise<string[]> {
    try {
      const ibgeStateCode = STATE_TO_IBGE[stateCode];
      if (!ibgeStateCode) {
        this.logger.warn(`Código de estado brasileiro não encontrado: ${stateCode}`);
        return BRAZIL_CITIES[stateCode] || [];
      }

      const response = await axios.get(
        `${this.ibgeApiUrl}/estados/${ibgeStateCode}/municipios`,
        {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        const cities = response.data
          .map((municipio: any) => municipio.nome)
          .sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'));
        
        this.logger.log(`Buscadas ${cities.length} cidades brasileiras para o estado ${stateCode} via IBGE`);
        return cities;
      }

      this.logger.warn(`API IBGE retornou dados inválidos para estado ${stateCode}, usando lista estática`);
      return BRAZIL_CITIES[stateCode] || [];
    } catch (error: any) {
      this.logger.error(`Erro ao buscar cidades do IBGE para estado ${stateCode}: ${error.message}`);
      return BRAZIL_CITIES[stateCode] || [];
    }
  }

}
