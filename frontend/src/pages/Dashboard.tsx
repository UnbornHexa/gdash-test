import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, Cloud, Droplets, Wind, Thermometer, MapPin, AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';

interface WeatherLog {
  _id: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    condition: string;
    precipitation: number;
  };
}

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

interface Insights {
  statistics: {
    averageTemperature: number;
    averageHumidity: number;
    averageWindSpeed: number;
    maxTemperature: number;
    minTemperature: number;
    dataPoints: number;
  };
  trends: {
    temperature: string;
    temperatureChange: number;
  };
  comfort: {
    index: number;
    level: string;
  };
  classification: string;
  alerts: string[];
  alertCards?: AlertCard[];
  statusCards?: StatusCard[];
  explanatoryText?: string[];
  summary: string;
  generatedAt: string;
}

// Função para capitalizar primeira letra
const capitalizeFirst = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Função para formatar condições meteorológicas
const formatWeatherCondition = (condition: string): string => {
  if (!condition) return '';
  
  const conditionMap: { [key: string]: string } = {
    clear: 'Limpo',
    mainly_clear: 'Principalmente Limpo',
    partly_cloudy: 'Parcialmente Nublado',
    overcast: 'Nublado',
    foggy: 'Nebuloso',
    depositing_rime_fog: 'Nevoeiro com Geada',
    light_drizzle: 'Chuva Leve',
    moderate_drizzle: 'Chuva Moderada',
    dense_drizzle: 'Chuva Densa',
    light_freezing_drizzle: 'Chuvisco Gelado Leve',
    dense_freezing_drizzle: 'Chuvisco Gelado Denso',
    slight_rain: 'Chuva Fraca',
    moderate_rain: 'Chuva Moderada',
    heavy_rain: 'Chuva Forte',
    light_freezing_rain: 'Chuva Gelada Leve',
    heavy_freezing_rain: 'Chuva Gelada Forte',
    slight_snow: 'Neve Fraca',
    moderate_snow: 'Neve Moderada',
    heavy_snow: 'Neve Forte',
    snow_grains: 'Grãos de Neve',
    slight_rain_showers: 'Chuviscos Leves',
    moderate_rain_showers: 'Chuviscos Moderados',
    violent_rain_showers: 'Chuviscos Violentos',
    slight_snow_showers: 'Aguaceiros de Neve Leves',
    heavy_snow_showers: 'Aguaceiros de Neve Fortes',
    thunderstorm: 'Trovoada',
    thunderstorm_with_slight_hail: 'Trovoada com Granizo Leve',
    thunderstorm_with_heavy_hail: 'Trovoada com Granizo Forte',
    unknown: 'Desconhecido',
  };

  return conditionMap[condition] || capitalizeFirst(condition.replace(/_/g, ' '));
};

// Função para formatar o resumo com cada seção em uma linha e labels em negrito
const formatSummary = (summary: string): React.ReactNode[] => {
  if (!summary) return [];
  
  // Divide o resumo por pipe (|) que separa as seções principais
  const sections = summary.split(' | ').filter(s => s.trim().length > 0);
  
  return sections.map((section, index) => {
    const trimmed = section.trim();
    
    // Verifica se tem dois pontos (label: valor)
    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const label = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      return (
        <p key={index} className="text-sm text-muted-foreground mb-2">
          <span className="font-bold text-gray-900">{label}:</span> {value}
        </p>
      );
    }
    
    // Se não tem dois pontos, apenas adiciona o texto
    return (
      <p key={index} className="text-sm text-muted-foreground mb-2">
        {trimmed}
      </p>
    );
  });
};

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [weatherData, setWeatherData] = useState<WeatherLog[]>([]);
  const [latest, setLatest] = useState<WeatherLog | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationInfo, setLocationInfo] = useState<{ city: string; state: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Obtém localização do usuário
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        // Primeiro, tenta obter do perfil do usuário
        try {
          const profileResponse = await api.get('/users/profile/me');
          if (profileResponse.data?.location) {
            setUserLocation(profileResponse.data.location);
            return;
          }
        } catch (err) {
          console.log('Perfil do usuário não possui localização salva');
        }

        // Se não tiver no perfil, solicita permissão do navegador
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              
              setUserLocation(location);
              
              // Salva no backend
              try {
                await api.post('/users/profile/location', location);
                // Atualiza o usuário no contexto
                await updateUser();
              } catch (err) {
                console.error('Erro ao salvar localização:', err);
              }
            },
            (err) => {
              console.error('Erro ao obter localização:', err);
              setLocationError('Não foi possível obter sua localização. Usando dados gerais.');
              // Usa localização padrão (São Paulo)
              setUserLocation({ latitude: -23.5505, longitude: -46.6333 });
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        } else {
          setLocationError('Geolocalização não é suportada pelo navegador.');
          setUserLocation({ latitude: -23.5505, longitude: -46.6333 });
        }
      } catch (error) {
        console.error('Erro ao obter localização:', error);
        setLocationError('Erro ao obter localização. Usando dados gerais.');
        setUserLocation({ latitude: -23.5505, longitude: -46.6333 });
      }
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      // Busca informações de localização (cidade/estado)
      const fetchLocationInfo = async () => {
        try {
          const response = await api.get('/weather/location', {
            params: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
          }).catch(() => ({ data: null }));
          
          if (response?.data) {
            setLocationInfo({
              city: response.data.city || 'Localização desconhecida',
              state: response.data.state || '',
            });
          }
        } catch (error) {
          console.error('Erro ao buscar informações de localização:', error);
        }
      };

      fetchLocationInfo();
      fetchData();
      const interval = setInterval(fetchData, 60000); // Atualiza a cada minuto
      return () => clearInterval(interval);
    }
  }, [userLocation]);

  const fetchData = async () => {
    if (!userLocation) return;

    try {
      setError(null);
      
      // Busca dados meteorológicos em tempo real para a localização do usuário
      const currentWeatherResponse = await api.get('/weather/current', {
        params: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
      }).catch(() => ({ data: null }));

      // Busca histórico de logs e insights (com coordenadas para previsões)
      const [logsResponse, insightsResponse] = await Promise.all([
        api.get('/weather/logs', { params: { page: 1, limit: 50 } }).catch(() => ({ data: { data: [] } })),
        api.get('/weather/insights', {
          params: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
        }).catch(() => ({ data: null })),
      ]);

      // Usa dados em tempo real se disponível, senão usa o último log
      if (currentWeatherResponse?.data) {
        setLatest(currentWeatherResponse.data as WeatherLog);
      } else if (logsResponse?.data?.data && logsResponse.data.data.length > 0) {
        setLatest(logsResponse.data.data[0]);
      } else {
        setLatest(null);
      }

      // Trata dados de logs
      if (logsResponse?.data?.data && Array.isArray(logsResponse.data.data)) {
        setWeatherData([...logsResponse.data.data].reverse());
      } else {
        setWeatherData([]);
      }

      // Trata insights
      if (insightsResponse?.data) {
        setInsights(insightsResponse.data);
      } else {
        setInsights(null);
      }
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao carregar dados meteorológicos';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/weather/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'weather-logs.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const handleExportXLSX = async () => {
    try {
      const response = await api.get('/weather/export/xlsx', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'weather-logs.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting XLSX:', error);
    }
  };

  const chartData = weatherData.map((log) => ({
    time: new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    temperature: log.current.temperature,
    humidity: log.current.humidity,
    windSpeed: log.current.windSpeed,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados meteorológicos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel Meteorológico</h1>
          {userLocation && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>
                {locationInfo ? (
                  <>
                    {locationInfo.city}
                    {locationInfo.state && `, ${locationInfo.state}`}
                    {' '}
                    <span className="text-gray-500">
                      ({userLocation.latitude.toFixed(2)}, {userLocation.longitude.toFixed(2)})
                    </span>
                  </>
                ) : (
                  <>
                    Localização:{' '}
                    <span className="text-gray-500">
                      ({userLocation.latitude.toFixed(2)}, {userLocation.longitude.toFixed(2)})
                    </span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" disabled={weatherData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={handleExportXLSX} variant="outline" disabled={weatherData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar XLSX
          </Button>
        </div>
      </div>

      {locationError && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800 text-sm">{locationError}</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
            <Button 
              onClick={fetchData} 
              variant="outline" 
              className="mt-4"
              size="sm"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!latest && !loading && !error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">
              Nenhum dado meteorológico encontrado. Aguarde alguns minutos enquanto os dados são coletados.
            </p>
          </CardContent>
        </Card>
      )}

      {latest && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temperatura</CardTitle>
              <Thermometer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest.current.temperature.toFixed(1)}°C</div>
              <p className="text-xs text-muted-foreground">{formatWeatherCondition(latest.current.condition)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Umidade</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest.current.humidity.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">Umidade relativa</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Velocidade do Vento</CardTitle>
              <Wind className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest.current.windSpeed.toFixed(1)} km/h</div>
              <p className="text-xs text-muted-foreground">Velocidade atual do vento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precipitação</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest.current.precipitation.toFixed(1)} mm</div>
              <p className="text-xs text-muted-foreground">Precipitação atual</p>
            </CardContent>
          </Card>
        </div>
      )}

      {insights && (
        <>
          {/* Cards de Status */}
          {insights.statusCards && insights.statusCards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.statusCards.map((statusCard, index) => {
                const getStatusCardColors = (type: string) => {
                  switch (type) {
                    case 'extreme_heat':
                      return 'border-red-300 bg-red-50';
                    case 'cold':
                      return 'border-blue-300 bg-blue-50';
                    case 'comfortable':
                      return 'border-green-300 bg-green-50';
                    case 'rainy':
                      return 'border-gray-300 bg-gray-50';
                    case 'windy':
                      return 'border-yellow-300 bg-yellow-50';
                    default:
                      return 'border-gray-200 bg-gray-50';
                  }
                };

                return (
                  <Card key={index} className={getStatusCardColors(statusCard.type)}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">{statusCard.icon}</span>
                        {statusCard.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{statusCard.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Textos Explicativos */}
          {insights.explanatoryText && insights.explanatoryText.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Info className="h-5 w-5" />
                  Análise Detalhada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights.explanatoryText.map((text, index) => (
                  <p key={index} className="text-sm text-blue-800">
                    {text}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Cards de Alerta */}
          {insights.alertCards && insights.alertCards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.alertCards.map((alertCard, index) => {
                const getAlertCardStyles = (type: string) => {
                  switch (type) {
                    case 'danger':
                      return {
                        border: 'border-red-300',
                        bg: 'bg-red-50',
                        iconColor: 'text-red-600',
                        textColor: 'text-red-800',
                        icon: <AlertCircle className="h-5 w-5" />,
                      };
                    case 'warning':
                      return {
                        border: 'border-orange-300',
                        bg: 'bg-orange-50',
                        iconColor: 'text-orange-600',
                        textColor: 'text-orange-800',
                        icon: <AlertTriangle className="h-5 w-5" />,
                      };
                    case 'info':
                      return {
                        border: 'border-blue-300',
                        bg: 'bg-blue-50',
                        iconColor: 'text-blue-600',
                        textColor: 'text-blue-800',
                        icon: <Info className="h-5 w-5" />,
                      };
                    case 'success':
                      return {
                        border: 'border-green-300',
                        bg: 'bg-green-50',
                        iconColor: 'text-green-600',
                        textColor: 'text-green-800',
                        icon: <CheckCircle className="h-5 w-5" />,
                      };
                    default:
                      return {
                        border: 'border-gray-300',
                        bg: 'bg-gray-50',
                        iconColor: 'text-gray-600',
                        textColor: 'text-gray-800',
                        icon: <Info className="h-5 w-5" />,
                      };
                  }
                };

                const styles = getAlertCardStyles(alertCard.type);

                return (
                  <Card key={index} className={`${styles.border} ${styles.bg}`}>
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${styles.textColor}`}>
                        <span className={styles.iconColor}>{styles.icon}</span>
                        {alertCard.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-sm ${styles.textColor}`}>{alertCard.message}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Card Principal de Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Análise e previsões</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div>
                <div className="space-y-1">
                  {formatSummary(insights.summary)}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Índice de Conforto</p>
                  <p className="text-2xl font-bold">{insights.comfort.index}</p>
                  <p className="text-xs text-muted-foreground">{insights.comfort.level}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Classificação</p>
                  <p className="text-2xl font-bold">{insights.classification}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tendência de Temperatura</p>
                  <p className="text-2xl font-bold">{insights.trends.temperature}</p>
                  <p className="text-xs text-muted-foreground">
                    {insights.trends.temperatureChange > 0 ? '+' : ''}
                    {insights.trends.temperatureChange.toFixed(1)}°C
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Temp. Média</p>
                  <p className="text-2xl font-bold">{insights.statistics.averageTemperature.toFixed(1)}°C</p>
                </div>
              </div>
              {/* Mantém alertas antigos se os novos cards não estiverem disponíveis */}
              {insights.alerts && insights.alerts.length > 0 && (!insights.alertCards || insights.alertCards.length === 0) && (
                <div>
                  <h3 className="font-semibold mb-2">Alertas</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {insights.alerts.map((alert, index) => (
                      <li key={index} className="text-sm text-orange-600">{alert}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {chartData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Tendências de Temperatura e Umidade</CardTitle>
              <CardDescription>Últimos 50 pontos de dados</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="temperature" stroke="#8884d8" name="Temperatura (°C)" />
                  <Line type="monotone" dataKey="humidity" stroke="#82ca9d" name="Umidade (%)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Velocidade do Vento</CardTitle>
              <CardDescription>Últimos 50 pontos de dados</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="windSpeed" fill="#8884d8" name="Velocidade do Vento (km/h)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
