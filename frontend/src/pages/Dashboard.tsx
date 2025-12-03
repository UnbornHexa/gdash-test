import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import { Download, Cloud, Droplets, Wind, Thermometer, MapPin } from 'lucide-react';

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

      // Busca TODOS os dados históricos usando paginação
      const fetchAllLogs = async () => {
        let allLogs: WeatherLog[] = [];
        let page = 1;
        const limit = 100; // Busca 100 por vez
        let hasMore = true;

        console.log('🔍 Iniciando busca de dados históricos...');

        while (hasMore) {
          try {
            const response = await api.get('/weather/logs', { 
              params: { page, limit } 
            });
            
            console.log(`📄 Página ${page}:`, {
              dados: response?.data?.data?.length || 0,
              total: response?.data?.meta?.total || 0,
              totalPages: response?.data?.meta?.totalPages || 0,
            });
            
            if (response?.data?.data && Array.isArray(response.data.data)) {
              const pageLogs = response.data.data;
              allLogs = [...allLogs, ...pageLogs];
              
              // Verifica se há mais páginas ou se ainda há dados para buscar
              const total = response.data.meta?.total || 0;
              const totalPages = response.data.meta?.totalPages || 1;
              
              // Continua se houver mais páginas OU se não recebeu dados suficientes
              hasMore = page < totalPages && pageLogs.length > 0;
              page++;
              
              // Se chegou no total, para
              if (allLogs.length >= total) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          } catch (err) {
            console.error('❌ Erro ao buscar página de logs:', err);
            hasMore = false;
          }
        }

        console.log(`✅ Total de logs carregados: ${allLogs.length}`);
        if (allLogs.length > 0) {
          const oldest = allLogs[allLogs.length - 1];
          const newest = allLogs[0];
          console.log('📅 Período:', {
            maisAntigo: new Date(oldest.timestamp).toLocaleString('pt-BR'),
            maisRecente: new Date(newest.timestamp).toLocaleString('pt-BR'),
          });
        }

        return allLogs;
      };

      // Busca insights e todos os logs em paralelo
      // Passa um limite muito alto para insights usar todos os dados históricos
      const [allLogs, insightsResponse] = await Promise.all([
        fetchAllLogs(),
        api.get('/weather/insights', { params: { limit: 10000 } }).catch(() => ({ data: null })),
      ]);

      // Usa dados em tempo real se disponível, senão usa o último log
      if (currentWeatherResponse?.data) {
        setLatest(currentWeatherResponse.data as WeatherLog);
      } else if (allLogs.length > 0) {
        setLatest(allLogs[0]); // O primeiro é o mais recente (já ordenado por timestamp desc)
      } else {
        setLatest(null);
      }

      // Trata dados de logs - inverte para mostrar do mais antigo ao mais recente no gráfico
      // IMPORTANTE: Mostra TODOS os dados históricos, independente da localização
      if (allLogs.length > 0) {
        console.log(`📊 Preparando ${allLogs.length} registros para exibição`);
        const sortedLogs = [...allLogs].reverse(); // Do mais antigo ao mais recente
        setWeatherData(sortedLogs);
      } else {
        console.warn('⚠️ Nenhum log encontrado no banco de dados');
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

  // Função para formatar apenas horário (sem data)
  const formatChartLabel = (timestamp: string) => {
    const date = new Date(timestamp);
    // Sempre mostra apenas horário
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Verifica se há dados de múltiplos dias
  const hasMultipleDays = (() => {
    if (weatherData.length === 0) return false;
    const firstDay = new Date(weatherData[0].timestamp).toDateString();
    const lastDay = new Date(weatherData[weatherData.length - 1].timestamp).toDateString();
    return firstDay !== lastDay;
  })();

  const chartData = weatherData.map((log, index) => {
    const currentDate = new Date(log.timestamp);
    const prevDate = index > 0 ? new Date(weatherData[index - 1].timestamp) : null;
    const isNewDay = prevDate && currentDate.toDateString() !== prevDate.toDateString();
    
    return {
      time: formatChartLabel(log.timestamp),
      timeOnly: formatChartLabel(log.timestamp), // Mantém apenas horário para o eixo X
      fullDateTime: currentDate.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      timestamp: log.timestamp,
      temperature: log.current.temperature,
      humidity: log.current.humidity,
      windSpeed: log.current.windSpeed,
      isNewDay: isNewDay || false,
      dayStart: isNewDay ? currentDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) : null,
    };
  });

  // Cria array de labels formatados para o eixo X
  const xAxisLabels = chartData.map((item) => {
    if (item.isNewDay && item.dayStart) {
      // Se for início de novo dia, mostra horário e data
      return `${item.timeOnly}\n${item.dayStart}`;
    }
    // Caso contrário, mostra apenas horário
    return item.timeOnly;
  });

  // Identifica os pontos onde há mudança de dia para criar linhas divisórias
  const dayDividers = chartData
    .map((item, index) => ({
      ...item,
      index
    }))
    .filter(item => item.isNewDay)
    .map(item => ({
      x: item.time,
      label: item.dayStart
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

      {weatherData.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-blue-800 text-sm">
              <strong>ℹ️ Informação:</strong> Exibindo <strong>{weatherData.length}</strong> registro(s) meteorológico(s) coletado(s).
              {weatherData.length > 0 && (
                <span>
                  {' '}Período: {new Date(weatherData[0].timestamp).toLocaleString('pt-BR')} até {new Date(weatherData[weatherData.length - 1].timestamp).toLocaleString('pt-BR')}
                </span>
              )}
              <br />
              <span className="text-xs text-blue-700 mt-2 block">
                <strong>Nota:</strong> A API Open-Meteo fornece apenas dados atuais e previsões. Os dados históricos disponíveis são apenas os que foram coletados desde que o sistema está rodando. Para construir um histórico completo, mantenha o sistema rodando continuamente.
              </span>
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
            {insights.alerts.length > 0 && (
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
      )}

      {chartData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Tendências de Temperatura e Umidade</CardTitle>
              <CardDescription>{chartData.length} pontos de dados históricos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    angle={-45}
                    textAnchor="end"
                    height={hasMultipleDays ? 120 : 60}
                    interval={chartData.length > 20 ? Math.floor(chartData.length / 10) : 0}
                    tickFormatter={(value, index) => {
                      // Retorna o label formatado com data se for início de novo dia
                      if (index !== undefined && xAxisLabels[index]) {
                        return xAxisLabels[index];
                      }
                      return value;
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value: any, payload: any[]) => {
                      if (payload && payload.length > 0 && payload[0].payload) {
                        return payload[0].payload.fullDateTime || value;
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  {dayDividers.map((divider, index) => (
                    <ReferenceLine 
                      key={`divider-${index}`}
                      x={divider.x} 
                      stroke="#999" 
                      strokeWidth={2.5}
                      strokeDasharray="0"
                    />
                  ))}
                  <Line type="monotone" dataKey="temperature" stroke="#8884d8" name="Temperatura (°C)" />
                  <Line type="monotone" dataKey="humidity" stroke="#82ca9d" name="Umidade (%)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Velocidade do Vento</CardTitle>
              <CardDescription>{chartData.length} pontos de dados históricos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    angle={-45}
                    textAnchor="end"
                    height={hasMultipleDays ? 120 : 60}
                    interval={chartData.length > 20 ? Math.floor(chartData.length / 10) : 0}
                    tickFormatter={(value, index) => {
                      // Retorna o label formatado com data se for início de novo dia
                      if (index !== undefined && xAxisLabels[index]) {
                        return xAxisLabels[index];
                      }
                      return value;
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value: any, payload: any[]) => {
                      if (payload && payload.length > 0 && payload[0].payload) {
                        return payload[0].payload.fullDateTime || value;
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  {dayDividers.map((divider, index) => (
                    <ReferenceLine 
                      key={`divider-bar-${index}`}
                      x={divider.x} 
                      stroke="#999" 
                      strokeWidth={2.5}
                      strokeDasharray="0"
                      label={{ 
                        value: divider.label || "", 
                        position: "insideTopLeft", 
                        fill: "#555", 
                        fontSize: 10,
                        fontWeight: "600",
                        offset: 5
                      }}
                    />
                  ))}
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
