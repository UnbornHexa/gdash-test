import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
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
  futureForecasts?: string[];
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

// Tipos de intervalo de filtro
type FilterInterval = '1min' | '5min' | '30min' | '1h';

// Função auxiliar para obter o fuso horário do navegador do usuário
const getUserTimeZone = (): string => {
  try {
    // Detecta automaticamente o fuso horário do navegador
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone;
  } catch (error) {
    console.warn('Não foi possível detectar o fuso horário, usando padrão UTC');
    // Fallback: usa o fuso horário do sistema ou UTC
    return 'UTC';
  }
};

// Função auxiliar para garantir que timestamps UTC sejam interpretados corretamente
const parseUTCTimestamp = (timestamp: string): Date => {
  // Se o timestamp não tem 'Z' no final e não tem offset, assume UTC
  if (!timestamp.endsWith('Z') && !timestamp.includes('+') && !timestamp.includes('-', 10)) {
    return new Date(timestamp + 'Z');
  }
  return new Date(timestamp);
};

// Função para arredondar timestamp para o intervalo exato no fuso horário local
// Retorna uma string formatada diretamente com o horário arredondado
const roundTimestampToInterval = (timestamp: string, interval: FilterInterval, userTimeZone: string): string => {
  const date = parseUTCTimestamp(timestamp);
  const timeZone = userTimeZone || getUserTimeZone();
  
  // Usa Intl.DateTimeFormat para obter componentes no timezone local
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  
  // Converte intervalo para minutos
  const intervalMinutes: Record<FilterInterval, number> = {
    '1min': 1,
    '5min': 5,
    '30min': 30,
    '1h': 60,
  };
  
  const minutes = intervalMinutes[interval];
  
  // Arredonda minutos para o intervalo exato
  let roundedMinutes = Math.round(minute / minutes) * minutes;
  let roundedHour = hour;
  
  // Trata overflow de minutos (ex: se arredondar 58 para 60, vira 1h a mais)
  if (roundedMinutes >= 60) {
    roundedMinutes = 0;
    roundedHour = (roundedHour + 1) % 24;
  }
  
  // Formata diretamente como string HH:MM no timezone local
  const hourStr = roundedHour.toString().padStart(2, '0');
  const minuteStr = roundedMinutes.toString().padStart(2, '0');
  
  return `${hourStr}:${minuteStr}`;
};

// Função para formatar apenas horário (sem data)
// Garante que timestamps UTC sejam exibidos no fuso horário local do usuário
// Se interval for fornecido, arredonda para o intervalo exato antes de formatar
const formatChartLabel = (timestamp: string, userTimeZone?: string, interval?: FilterInterval) => {
  const timeZone = userTimeZone || getUserTimeZone();
  
  if (interval) {
    // Arredonda para o intervalo exato e retorna diretamente
    return roundTimestampToInterval(timestamp, interval, timeZone);
  } else {
    // Usa timestamp original e formata normalmente
    const date = parseUTCTimestamp(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: timeZone
    });
  }
};

// Função para formatar data completa no fuso horário local do usuário
const formatFullDateTime = (timestamp: string, userTimeZone?: string) => {
  const date = parseUTCTimestamp(timestamp);
  const timeZone = userTimeZone || getUserTimeZone();
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone
  });
};

// Função para formatar apenas data no fuso horário local do usuário
const formatDateOnly = (timestamp: string, userTimeZone?: string) => {
  const date = parseUTCTimestamp(timestamp);
  const timeZone = userTimeZone || getUserTimeZone();
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: timeZone
  });
};

// Função para arredondar timestamp para o intervalo exato mais próximo
const roundToInterval = (timestamp: number, intervalMs: number): number => {
  return Math.round(timestamp / intervalMs) * intervalMs;
};

// Função para filtrar dados por período de datas
const filterDataByDateRange = (data: WeatherLog[], dateStart: string, dateEnd: string, timeZone: string): WeatherLog[] => {
  if (!dateStart && !dateEnd) {
    return data; // Se não há filtro de data, retorna todos os dados
  }

  return data.filter((log) => {
    const logDate = parseUTCTimestamp(log.timestamp);
    
    // Converte para data no timezone do usuário (apenas data, sem hora)
    const logDateStr = logDate.toLocaleDateString('en-CA', { timeZone: timeZone }); // formato YYYY-MM-DD
    
    if (dateStart && dateEnd) {
      // Filtro entre duas datas (inclusive)
      return logDateStr >= dateStart && logDateStr <= dateEnd;
    } else if (dateStart) {
      // Apenas data inicial
      return logDateStr >= dateStart;
    } else if (dateEnd) {
      // Apenas data final
      return logDateStr <= dateEnd;
    }
    
    return true;
  });
};

// Função para filtrar dados por intervalo
// Garante que os horários sejam exatos (ex: 19:00, 19:05, 19:10 para 5min)
const filterDataByInterval = (data: WeatherLog[], interval: FilterInterval): WeatherLog[] => {
  if (data.length === 0) return [];
  
  // Converte intervalo para milissegundos
  const intervalMs: Record<FilterInterval, number> = {
    '1min': 60 * 1000,
    '5min': 5 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
  };
  
  const intervalValue = intervalMs[interval];
  const filtered: WeatherLog[] = [];
  
  // Ordena dados do mais antigo ao mais recente
  const sortedData = [...data].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  if (sortedData.length === 0) return [];
  
  // Encontra o primeiro timestamp e arredonda para o intervalo exato anterior
  const firstTimestamp = new Date(sortedData[0].timestamp).getTime();
  const firstRounded = roundToInterval(firstTimestamp, intervalValue);
  
  // Gera todos os intervalos exatos desde o primeiro arredondado até o último timestamp
  const lastTimestamp = new Date(sortedData[sortedData.length - 1].timestamp).getTime();
  const targetIntervals: number[] = [];
  
  for (let targetTime = firstRounded; targetTime <= lastTimestamp; targetTime += intervalValue) {
    targetIntervals.push(targetTime);
  }
  
  // Para cada intervalo exato, encontra o ponto de dados mais próximo
  for (const targetTime of targetIntervals) {
    let closestLog: WeatherLog | null = null;
    let closestDistance = Infinity;
    
    // Procura o ponto mais próximo deste intervalo exato
    for (const log of sortedData) {
      const logTime = new Date(log.timestamp).getTime();
      const distance = Math.abs(logTime - targetTime);
      
      // Aceita pontos dentro de metade do intervalo (ex: para 5min, aceita até 2.5min de diferença)
      if (distance <= intervalValue / 2 && distance < closestDistance) {
        closestDistance = distance;
        closestLog = log;
      }
    }
    
    // Se encontrou um ponto próximo, adiciona (evita duplicatas)
    if (closestLog && !filtered.find(f => f._id === closestLog!._id)) {
      filtered.push(closestLog);
    }
  }
  
  // Se não encontrou nenhum ponto, pelo menos retorna o primeiro e último
  if (filtered.length === 0 && sortedData.length > 0) {
    filtered.push(sortedData[0]);
    if (sortedData.length > 1) {
      filtered.push(sortedData[sortedData.length - 1]);
    }
  }
  
  // Ordena novamente por timestamp para garantir ordem correta
  return filtered.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
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
  const [temperatureFilter, setTemperatureFilter] = useState<FilterInterval>('1h');
  const [windFilter, setWindFilter] = useState<FilterInterval>('1h');
  const [temperatureDateStart, setTemperatureDateStart] = useState<string>('');
  const [temperatureDateEnd, setTemperatureDateEnd] = useState<string>('');
  const [windDateStart, setWindDateStart] = useState<string>('');
  const [windDateEnd, setWindDateEnd] = useState<string>('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'csv' | 'xlsx' | null>(null);
  const [exportDateStart, setExportDateStart] = useState<string>('');
  const [exportDateEnd, setExportDateEnd] = useState<string>('');
  const [userTimeZone, setUserTimeZone] = useState<string>(() => getUserTimeZone());
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataCountRef = useRef<number>(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // Atualiza o perfil do usuário ao montar o componente para garantir que temos os dados mais recentes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user && (!user.name || user.name.trim() === '')) {
        try {
          await updateUser();
        } catch (error) {
          console.error('Erro ao atualizar perfil do usuário:', error);
        }
      }
    };
    fetchUserProfile();
  }, [user, updateUser]);

  // Hook para detectar mudanças no tamanho da janela
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Função para obter saudação baseada no horário
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
      return 'Boa tarde';
    } else {
      return 'Boa noite';
    }
  };

  // Hook para detectar se é a primeira vez após login e mostrar mensagem de boas-vindas
  useEffect(() => {
    // Verifica se já foi mostrada a mensagem nesta sessão
    const welcomeShown = sessionStorage.getItem('welcomeShown');
    // Verifica se deve mostrar a mensagem (primeira vez após login e tem nome)
    const userName = user?.name ? String(user.name).trim() : '';
    const shouldShowWelcome = !welcomeShown && userName.length > 0;
    
    if (shouldShowWelcome) {
      if (loading) {
        // Mostra a mensagem de boas-vindas enquanto carrega
        setShowWelcome(true);
      } else if (showWelcome && !loading) {
        // Quando o carregamento terminar e a mensagem estiver visível, aguarda um pouco e faz fade-out
        // Pequeno delay para garantir que a animação fade-in terminou
        const timer = setTimeout(() => {
          // Marca que já foi mostrada a mensagem nesta sessão
          sessionStorage.setItem('welcomeShown', 'true');
          // Marca que o usuário já logou antes (para próximas sessões) - só marca depois de mostrar
          if (!localStorage.getItem('hasLoggedBefore')) {
            localStorage.setItem('hasLoggedBefore', 'true');
          }
          
          // Inicia o fade-out da mensagem E o fade-in do dashboard ao mesmo tempo
          setShowDashboard(true); // Começa a mostrar o dashboard imediatamente
          
          // Após o fade-out (500ms), esconde completamente a mensagem
          setTimeout(() => {
            setShowWelcome(false);
          }, 500); // Duração da animação fade-out
        }, 1500); // Tempo que a mensagem fica visível antes de começar fade-out
        
        return () => clearTimeout(timer);
      }
    } else if (!loading && !shouldShowWelcome) {
      // Se já foi mostrada antes ou não tem nome, mostra o dashboard direto
      setShowDashboard(true);
    }
  }, [loading, user, showWelcome]);

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
      
      // Limpa intervalo anterior se existir
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Atualiza a cada 10 segundos para garantir que novos dados apareçam rapidamente
      // Os dados são coletados a cada 1 minuto (60 segundos), então 10 segundos garante
      // que os dados apareçam em até 10 segundos após serem coletados
      intervalRef.current = setInterval(() => {
        console.log('🔄 Atualizando dados automaticamente...');
        fetchData();
      }, 10000); // Atualiza a cada 10 segundos para detectar novos dados rapidamente
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
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
              params: { 
                page, 
                limit,
                latitude: userLocation.latitude,
                longitude: userLocation.longitude
              } 
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
          const detectedTimeZone = getUserTimeZone();
          console.log('📅 Período:', {
            maisAntigo: parseUTCTimestamp(oldest.timestamp).toLocaleString('pt-BR', { timeZone: detectedTimeZone }),
            maisRecente: parseUTCTimestamp(newest.timestamp).toLocaleString('pt-BR', { timeZone: detectedTimeZone }),
          });
        }

        return allLogs;
      };

      // Busca insights e todos os logs em paralelo
      // Passa um limite muito alto para insights usar todos os dados históricos
      // Também passa a localização para que os insights usem dados atuais se disponíveis
      const [allLogs, insightsResponse] = await Promise.all([
        fetchAllLogs(),
        api.get('/weather/insights', { 
          params: { 
            limit: 10000,
            latitude: userLocation.latitude,
            longitude: userLocation.longitude
          } 
        }).catch(() => ({ data: null })),
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
      // IMPORTANTE: Armazena todos os dados, a limitação será feita após aplicar os filtros
      if (allLogs.length > 0) {
        const previousCount = lastDataCountRef.current;
        const newCount = allLogs.length;
        
        // Verifica se há novos dados comparando timestamps do mais recente
        const previousLatest = weatherData.length > 0 ? weatherData[weatherData.length - 1] : null;
        const currentLatest = allLogs[0]; // O primeiro é o mais recente (ordenado por timestamp desc)
        
        const hasNewData = !previousLatest || 
          new Date(currentLatest.timestamp).getTime() > new Date(previousLatest.timestamp).getTime();
        
        if (newCount !== previousCount || hasNewData) {
          const timestamp = new Date(currentLatest.timestamp).toLocaleString('pt-BR');
          console.log(`📊 Novos dados detectados! ${previousCount} → ${newCount} registros | Mais recente: ${timestamp}`);
          lastDataCountRef.current = newCount;
        }
        
        console.log(`📊 Preparando ${allLogs.length} registros para exibição`);
        const sortedLogs = [...allLogs].reverse(); // Do mais antigo ao mais recente
        setWeatherData(sortedLogs);
      } else {
        console.warn('⚠️ Nenhum log encontrado no banco de dados');
        setWeatherData([]);
        lastDataCountRef.current = 0;
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

  const handleExportCSV = () => {
    setExportType('csv');
    setExportDialogOpen(true);
  };

  const handleExportXLSX = () => {
    setExportType('xlsx');
    setExportDialogOpen(true);
  };

  const handleConfirmExport = async () => {
    if (!exportType) return;

    try {
      const params: any = {};
      if (exportDateStart) params.dateStart = exportDateStart;
      if (exportDateEnd) params.dateEnd = exportDateEnd;

      const endpoint = exportType === 'csv' ? '/weather/export/csv' : '/weather/export/xlsx';
      const filename = exportType === 'csv' ? 'weather-logs.csv' : 'weather-logs.xlsx';
      
      const response = await api.get(endpoint, { 
        params,
        responseType: 'blob' 
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Fecha o modal e limpa os campos
      setExportDialogOpen(false);
      setExportDateStart('');
      setExportDateEnd('');
      setExportType(null);
    } catch (error) {
      console.error(`Error exporting ${exportType.toUpperCase()}:`, error);
    }
  };

  // Calcula o intervalo de labels do eixo X de forma inteligente
  // Mostra mais labels quando há poucos dados para melhor legibilidade
  // Ajusta baseado no tamanho da tela
  const calculateXAxisInterval = (dataLength: number) => {
    if (dataLength === 0) return 0;
    
    // Detecta largura da tela usando o estado
    const isMobile = windowWidth <= 640;
    const isTablet = windowWidth > 640 && windowWidth <= 1024;
    
    // Em mobile, mostra menos labels para evitar sobreposição
    if (isMobile) {
      if (dataLength <= 10) {
        return 0; // Mostra todos os labels
      } else if (dataLength <= 20) {
        return 1; // Mostra 1 a cada 2
      } else if (dataLength <= 30) {
        return Math.floor(dataLength / 8); // Aproximadamente 8 labels
      } else {
        return Math.floor(dataLength / 6); // Aproximadamente 6 labels
      }
    }
    
    // Em tablet, mostra quantidade intermediária
    if (isTablet) {
      if (dataLength <= 30) {
        return 0; // Mostra todos os labels
      } else if (dataLength <= 50) {
        return 1; // Mostra 1 a cada 2
      } else if (dataLength <= 100) {
        return Math.floor(dataLength / 12); // Aproximadamente 12 labels
      } else {
        return Math.floor(dataLength / 10); // Aproximadamente 10 labels
      }
    }
    
    // Desktop: comportamento original
    if (dataLength <= 30) {
      return 0; // Mostra todos os labels
    } else if (dataLength <= 50) {
      return 1; // Mostra 1 a cada 2 (pula 1)
    } else if (dataLength <= 100) {
      return Math.floor(dataLength / 15); // Aproximadamente 15 labels
    } else {
      // Com muitos dados, calcula para mostrar cerca de 10-12 labels
      return Math.floor(dataLength / 10);
    }
  };

  // Calcula altura do gráfico baseado no tamanho da tela
  const getChartHeight = () => {
    if (windowWidth <= 640) {
      return 250; // Mobile
    } else if (windowWidth <= 1024) {
      return 280; // Tablet
    }
    return 300; // Desktop
  };

  // Calcula margens do gráfico baseado no tamanho da tela
  const getChartMargins = (hasMultipleDays: boolean) => {
    const isMobile = windowWidth <= 640;
    const isTablet = windowWidth > 640 && windowWidth <= 1024;
    
    if (isMobile) {
      return {
        bottom: hasMultipleDays ? 80 : 40,
        top: 5,
        right: 10,
        left: 30
      };
    } else if (isTablet) {
      return {
        bottom: hasMultipleDays ? 90 : 50,
        top: 10,
        right: 30,
        left: 40
      };
    }
    
    return {
      bottom: hasMultipleDays ? 100 : 50,
      top: 10,
      right: 50,
      left: 50
    };
  };

  // Calcula largura do eixo Y baseado no tamanho da tela
  const getYAxisWidth = () => {
    if (windowWidth <= 640) {
      return 35; // Mobile
    } else if (windowWidth <= 1024) {
      return 40; // Tablet
    }
    return 50; // Desktop
  };

  // Limite de pontos exibidos: 15 no mobile, 30 no desktop
  // Mas só aplica se não houver filtro de período ativo
  const MAX_DISPLAY_POINTS = windowWidth <= 640 ? 15 : 30;
  const hasTemperatureDateFilter = temperatureDateStart || temperatureDateEnd;
  const hasWindDateFilter = windDateStart || windDateEnd;

  // Aplica filtros de período primeiro, depois filtro de intervalo
  let temperatureDataFiltered = filterDataByDateRange(weatherData, temperatureDateStart, temperatureDateEnd, userTimeZone);
  let windDataFiltered = filterDataByDateRange(weatherData, windDateStart, windDateEnd, userTimeZone);

  // Aplica filtros de intervalo aos dados já filtrados por período
  let filteredTemperatureData = filterDataByInterval(temperatureDataFiltered, temperatureFilter);
  let filteredWindData = filterDataByInterval(windDataFiltered, windFilter);

  // Limita aos pontos mais recentes APÓS aplicar o filtro
  // Mas só se não houver filtro de período ativo (quando há filtro de período, mostra todos os pontos do período)
  // Os dados filtrados estão ordenados do mais antigo ao mais recente, então pegamos os últimos N pontos
  if (!hasTemperatureDateFilter && filteredTemperatureData.length > MAX_DISPLAY_POINTS) {
    filteredTemperatureData = filteredTemperatureData.slice(-MAX_DISPLAY_POINTS);
  }
  if (!hasWindDateFilter && filteredWindData.length > MAX_DISPLAY_POINTS) {
    filteredWindData = filteredWindData.slice(-MAX_DISPLAY_POINTS);
  }

  // Processa dados para o gráfico de temperatura/umidade
  const temperatureChartData = filteredTemperatureData.map((log, index) => {
    const currentDate = parseUTCTimestamp(log.timestamp);
    const prevDate = index > 0 ? parseUTCTimestamp(filteredTemperatureData[index - 1].timestamp) : null;
    // Compara datas no fuso horário local do usuário
    const currentDateStr = currentDate.toLocaleDateString('pt-BR', { timeZone: userTimeZone });
    const prevDateStr = prevDate ? prevDate.toLocaleDateString('pt-BR', { timeZone: userTimeZone }) : null;
    const isNewDay = prevDate && currentDateStr !== prevDateStr;
    
    // Arredonda o timestamp para o intervalo exato antes de formatar
    const roundedTime = formatChartLabel(log.timestamp, userTimeZone, temperatureFilter);
    
    // Formata data completa com horário arredondado para o tooltip
    const dateStr = formatDateOnly(log.timestamp, userTimeZone);
    const fullDateTimeRounded = `${dateStr} ${roundedTime}`;
    
    return {
      time: roundedTime,
      timeOnly: roundedTime,
      uniqueKey: `${log.timestamp}-${index}-temp`,
      fullDateTime: fullDateTimeRounded,
      timestamp: log.timestamp,
      temperature: log.current.temperature,
      humidity: log.current.humidity,
      windSpeed: log.current.windSpeed,
      isNewDay: isNewDay || false,
      dayStart: isNewDay ? formatDateOnly(log.timestamp, userTimeZone) : null,
      chartIndex: index,
    };
  });

  // Processa dados para o gráfico de vento
  const windChartData = filteredWindData.map((log, index) => {
    const currentDate = parseUTCTimestamp(log.timestamp);
    const prevDate = index > 0 ? parseUTCTimestamp(filteredWindData[index - 1].timestamp) : null;
    // Compara datas no fuso horário local do usuário
    const currentDateStr = currentDate.toLocaleDateString('pt-BR', { timeZone: userTimeZone });
    const prevDateStr = prevDate ? prevDate.toLocaleDateString('pt-BR', { timeZone: userTimeZone }) : null;
    const isNewDay = prevDate && currentDateStr !== prevDateStr;
    
    // Arredonda o timestamp para o intervalo exato antes de formatar
    const roundedTime = formatChartLabel(log.timestamp, userTimeZone, windFilter);
    
    // Formata data completa com horário arredondado para o tooltip
    const dateStr = formatDateOnly(log.timestamp, userTimeZone);
    const fullDateTimeRounded = `${dateStr} ${roundedTime}`;
    
    return {
      time: roundedTime,
      timeOnly: roundedTime,
      uniqueKey: `${log.timestamp}-${index}-wind`,
      fullDateTime: fullDateTimeRounded,
      timestamp: log.timestamp,
      temperature: log.current.temperature,
      humidity: log.current.humidity,
      windSpeed: log.current.windSpeed,
      isNewDay: isNewDay || false,
      dayStart: isNewDay ? formatDateOnly(log.timestamp, userTimeZone) : null,
      chartIndex: index,
    };
  });

  // Cria estrutura de dados para os labels do eixo X (temperatura)
  const temperatureXAxisLabelsData = temperatureChartData.map((item) => {
    if (item.isNewDay && item.dayStart) {
      return {
        time: item.timeOnly,
        date: item.dayStart,
        hasDate: true
      };
    }
    return {
      time: item.timeOnly,
      hasDate: false
    };
  });

  // Cria estrutura de dados para os labels do eixo X (vento)
  const windXAxisLabelsData = windChartData.map((item) => {
    if (item.isNewDay && item.dayStart) {
      return {
        time: item.timeOnly,
        date: item.dayStart,
        hasDate: true
      };
    }
    return {
      time: item.timeOnly,
      hasDate: false
    };
  });

  // Verifica se há dados de múltiplos dias (temperatura)
  const hasMultipleDaysTemp = (() => {
    if (temperatureChartData.length === 0) return false;
    const firstDay = new Date(temperatureChartData[0].timestamp).toDateString();
    const lastDay = new Date(temperatureChartData[temperatureChartData.length - 1].timestamp).toDateString();
    return firstDay !== lastDay;
  })();

  // Verifica se há dados de múltiplos dias (vento)
  const hasMultipleDaysWind = (() => {
    if (windChartData.length === 0) return false;
    const firstDay = new Date(windChartData[0].timestamp).toDateString();
    const lastDay = new Date(windChartData[windChartData.length - 1].timestamp).toDateString();
    return firstDay !== lastDay;
  })();

  // Componente customizado para renderizar ticks do eixo X com data abaixo do horário (temperatura)
  const TemperatureCustomTick = ({ x, y, payload }: any) => {
    const chartItemIndex = temperatureChartData.findIndex(d => d.uniqueKey === payload.value);
    const labelData = chartItemIndex >= 0 ? temperatureXAxisLabelsData[chartItemIndex] : null;
    
    // Detecta tamanho da tela para ajustar fontes usando o estado
    const isMobile = windowWidth <= 640;
    const isTablet = windowWidth > 640 && windowWidth <= 1024;
    
    // Ajusta tamanhos de fonte e espaçamento baseado no tamanho da tela
    const timeFontSize = isMobile ? 9 : isTablet ? 10 : 11;
    const dateFontSize = isMobile ? 10 : isTablet ? 12 : 13;
    const baseY = labelData?.hasDate ? (isMobile ? y + 10 : y + 12) : (isMobile ? y + 8 : y + 10);
    const dateOffset = isMobile ? 14 : 18;
    
    if (!labelData) {
      const item = temperatureChartData.find(d => d.uniqueKey === payload.value);
      return (
        <text 
          x={x} 
          y={baseY} 
          textAnchor="middle" 
          fill="#666" 
          fontSize={isMobile ? 9 : 12}
        >
          {item?.timeOnly || payload.value}
        </text>
      );
    }

    if (labelData.hasDate) {
      // Quando há data, posiciona horário na primeira linha e data na segunda linha abaixo
      // A data é destacada com negrito, cor mais escura e tamanho maior para ser mais identificável
      return (
        <g>
          <text 
            x={x} 
            y={baseY} 
            textAnchor="middle" 
            fill="#666" 
            fontSize={timeFontSize}
          >
            {labelData.time}
          </text>
          <text 
            x={x} 
            y={baseY + dateOffset} 
            textAnchor="middle" 
            fill="#1a1a1a" 
            fontSize={dateFontSize} 
            style={{ fontWeight: 'bold', fontFamily: 'inherit' }}
          >
            {labelData.date}
          </text>
        </g>
      );
    }

    return (
      <text 
        x={x} 
        y={baseY} 
        textAnchor="middle" 
        fill="#666" 
        fontSize={isMobile ? 9 : 12}
      >
        {labelData.time}
      </text>
    );
  };

  // Componente customizado para renderizar ticks do eixo X com data abaixo do horário (vento)
  const WindCustomTick = ({ x, y, payload }: any) => {
    const chartItemIndex = windChartData.findIndex(d => d.uniqueKey === payload.value);
    const labelData = chartItemIndex >= 0 ? windXAxisLabelsData[chartItemIndex] : null;
    
    // Detecta tamanho da tela para ajustar fontes usando o estado
    const isMobile = windowWidth <= 640;
    const isTablet = windowWidth > 640 && windowWidth <= 1024;
    
    // Ajusta tamanhos de fonte e espaçamento baseado no tamanho da tela
    const timeFontSize = isMobile ? 9 : isTablet ? 10 : 11;
    const dateFontSize = isMobile ? 10 : isTablet ? 12 : 13;
    const baseY = labelData?.hasDate ? (isMobile ? y + 10 : y + 12) : (isMobile ? y + 8 : y + 10);
    const dateOffset = isMobile ? 14 : 18;
    
    if (!labelData) {
      const item = windChartData.find(d => d.uniqueKey === payload.value);
      return (
        <text 
          x={x} 
          y={baseY} 
          textAnchor="middle" 
          fill="#666" 
          fontSize={isMobile ? 9 : 12}
        >
          {item?.timeOnly || payload.value}
        </text>
      );
    }

    if (labelData.hasDate) {
      return (
        <g>
          <text 
            x={x} 
            y={baseY} 
            textAnchor="middle" 
            fill="#666" 
            fontSize={timeFontSize}
          >
            {labelData.time}
          </text>
          <text 
            x={x} 
            y={baseY + dateOffset} 
            textAnchor="middle" 
            fill="#1a1a1a" 
            fontSize={dateFontSize} 
            style={{ fontWeight: 'bold', fontFamily: 'inherit' }}
          >
            {labelData.date}
          </text>
        </g>
      );
    }

    return (
      <text 
        x={x} 
        y={baseY} 
        textAnchor="middle" 
        fill="#666" 
        fontSize={isMobile ? 9 : 12}
      >
        {labelData.time}
      </text>
    );
  };





  // Componente de mensagem de boas-vindas (mostra enquanto carrega ou durante fade-out)
  const welcomeShown = sessionStorage.getItem('welcomeShown');
  // Garante que pegamos o nome do usuário corretamente - aguarda user estar disponível
  const userName = user?.name ? String(user.name).trim() : '';
  const hasName = userName.length > 0;
  const isFirstTime = !welcomeShown && hasName;
  // Verifica se já logou antes - só considera se já mostrou a mensagem antes nesta sessão também
  const hasLoggedBefore = localStorage.getItem('hasLoggedBefore') === 'true' && welcomeShown === 'true';
  const shouldShowWelcomeMessage = (showWelcome || (loading && isFirstTime)) && hasName && user;
  
  // Se está carregando e não deve mostrar mensagem de boas-vindas, mostra spinner
  if (loading && !isFirstTime) {
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
    <div className="space-y-4 sm:space-y-6 relative min-h-[400px]">
      {/* Mensagem de boas-vindas - aparece no lugar do carregamento */}
      {shouldShowWelcomeMessage && (
        <div 
          className={`flex items-center justify-center min-h-[400px] ${
            showDashboard ? 'absolute top-0 left-0 right-0' : 'relative'
          } ${
            showWelcome && !loading 
              ? 'welcome-message-exit' 
              : 'welcome-message-enter'
          }`}
          style={{ 
            zIndex: showDashboard ? 10 : 'auto'
          }}
        >
          <div className="text-center">
            <div className="space-y-4">
              {hasLoggedBefore === 'true' ? (
                <h2 className="text-3xl sm:text-4xl font-light text-gray-900">
                  Bem-vindo de volta
                </h2>
              ) : (
                <>
                  <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-2">
                    {(() => {
                      const greeting = getGreeting();
                      // Tenta pegar o nome de várias fontes, sempre verificando se existe e não está vazio
                      let name = '';
                      if (user?.name && typeof user.name === 'string' && user.name.trim()) {
                        name = user.name.trim();
                      } else if (userName && userName.trim()) {
                        name = userName.trim();
                      }
                      
                      // Monta a mensagem: "Bom dia Nome." ou apenas "Bom dia." se não tiver nome
                      const message = name ? `${greeting} ${name}.` : `${greeting}.`;
                      return message;
                    })()}
                  </h2>
                  <p className="text-lg sm:text-xl text-gray-600 mt-2">
                    Seja bem-vindo
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo do dashboard - aparece durante fade-out da mensagem */}
      {(!shouldShowWelcomeMessage || showDashboard) && (
        <div 
          className={`space-y-4 sm:space-y-6 ${
            showDashboard && shouldShowWelcomeMessage
              ? 'dashboard-fade-in' 
              : !shouldShowWelcomeMessage
                ? 'opacity-100'
                : 'opacity-0'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Painel Meteorológico</h1>
          {userLocation && (
            <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-600">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="break-words">
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
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleExportCSV} 
            variant="outline" 
            disabled={weatherData.length === 0}
            className="w-full sm:w-auto"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Exportar CSV</span>
            <span className="xs:hidden">CSV</span>
          </Button>
          <Button 
            onClick={handleExportXLSX} 
            variant="outline" 
            disabled={weatherData.length === 0}
            className="w-full sm:w-auto"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Exportar XLSX</span>
            <span className="xs:hidden">XLSX</span>
          </Button>
        </div>
      </div>

      {locationError && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-yellow-800 text-xs sm:text-sm">{locationError}</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-red-800 text-xs sm:text-sm">{error}</p>
            <Button 
              onClick={fetchData} 
              variant="outline" 
              className="mt-3 sm:mt-4 w-full sm:w-auto"
              size="sm"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!latest && !loading && !error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-yellow-800 text-xs sm:text-sm">
              Nenhum dado meteorológico encontrado. Aguarde alguns minutos enquanto os dados são coletados.
            </p>
          </CardContent>
        </Card>
      )}

      {latest && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
            <CardTitle className="text-lg sm:text-xl">Análise e previsões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 pt-2">
            <div>
              <div className="space-y-1">
                {formatSummary(insights?.summary || '')}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Índice de Conforto</p>
                <p className="text-2xl font-bold">{insights?.comfort?.index ?? '-'}</p>
                <p className="text-xs text-muted-foreground">{insights?.comfort?.level ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classificação</p>
                <p className="text-2xl font-bold">{insights?.classification ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tendência de Temperatura</p>
                <p className="text-2xl font-bold">{insights?.trends?.temperature ?? '-'}</p>
                <p className="text-xs text-muted-foreground">
                  {insights?.trends?.temperatureChange != null ? (
                    <>
                      {insights.trends.temperatureChange > 0 ? '+' : ''}
                      {insights.trends.temperatureChange.toFixed(1)}°C
                    </>
                  ) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Temp. Média</p>
                <p className="text-2xl font-bold">
                  {insights?.statistics?.averageTemperature != null 
                    ? `${insights.statistics.averageTemperature.toFixed(1)}°C` 
                    : '-'}
                </p>
              </div>
            </div>
            {(insights?.alerts && insights.alerts.length > 0) || (insights?.futureForecasts && insights.futureForecasts.length > 0) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {insights?.alerts && insights.alerts.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">Alertas</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {insights.alerts.map((alert, index) => (
                        <li key={index} className="text-xs sm:text-sm text-orange-600">{alert}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights?.futureForecasts && insights.futureForecasts.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">Previsões Futuras</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {insights.futureForecasts.map((forecast, index) => (
                        <li key={index} className="text-xs sm:text-sm text-blue-600">{forecast}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {temperatureChartData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Tendências de Temperatura e Umidade</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{temperatureChartData.length} pontos de dados históricos</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Intervalo:</span>
                  <div className="flex flex-wrap gap-1 border rounded-md p-1 w-full sm:w-auto">
                    <Button
                      variant={temperatureFilter === '1h' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTemperatureFilter('1h')}
                      className="h-7 px-2 text-xs flex-1 sm:flex-none"
                    >
                      1h
                    </Button>
                    <Button
                      variant={temperatureFilter === '30min' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTemperatureFilter('30min')}
                      className="h-7 px-2 text-xs flex-1 sm:flex-none"
                    >
                      30min
                    </Button>
                    <Button
                      variant={temperatureFilter === '5min' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTemperatureFilter('5min')}
                      className="h-7 px-2 text-xs flex-1 sm:flex-none"
                    >
                      5min
                    </Button>
                    <Button
                      variant={temperatureFilter === '1min' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTemperatureFilter('1min')}
                      className="h-7 px-2 text-xs flex-1 sm:flex-none"
                    >
                      1min
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-1">
                  <Label htmlFor="temp-date-start" className="text-xs sm:text-sm whitespace-nowrap">Data Inicial:</Label>
                  <Input
                    id="temp-date-start"
                    type="date"
                    value={temperatureDateStart}
                    onChange={(e) => setTemperatureDateStart(e.target.value)}
                    className="h-8 text-xs sm:text-sm w-full sm:w-auto"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-1">
                  <Label htmlFor="temp-date-end" className="text-xs sm:text-sm whitespace-nowrap">Data Final:</Label>
                  <Input
                    id="temp-date-end"
                    type="date"
                    value={temperatureDateEnd}
                    onChange={(e) => setTemperatureDateEnd(e.target.value)}
                    min={temperatureDateStart || undefined}
                    className="h-8 text-xs sm:text-sm w-full sm:w-auto"
                  />
                </div>
                {(temperatureDateStart || temperatureDateEnd) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTemperatureDateStart('');
                      setTemperatureDateEnd('');
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="chart-container">
              <ResponsiveContainer width="100%" height={getChartHeight()}>
                <LineChart 
                  data={temperatureChartData} 
                  margin={getChartMargins(hasMultipleDaysTemp)}
                  key={`temp-${temperatureFilter}`}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="uniqueKey"
                    type="category"
                    height={hasMultipleDaysTemp ? (windowWidth <= 640 ? 70 : 90) : (windowWidth <= 640 ? 35 : 45)}
                    interval={calculateXAxisInterval(temperatureChartData.length)}
                    tick={<TemperatureCustomTick />}
                    angle={windowWidth <= 640 ? -45 : 0}
                    textAnchor={windowWidth <= 640 ? "end" : "middle"}
                    tickMargin={windowWidth <= 640 ? 8 : 5}
                  />
                  <YAxis width={getYAxisWidth()} />
                  <Tooltip 
                    labelFormatter={(value: any, payload: any[]) => {
                      if (payload && payload.length > 0 && payload[0].payload) {
                        return payload[0].payload.fullDateTime || value;
                      }
                      return value;
                    }}
                    contentStyle={{
                      fontSize: windowWidth <= 640 ? '11px' : '13px',
                      padding: windowWidth <= 640 ? '6px' : '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      fontSize: windowWidth <= 640 ? '10px' : '12px',
                      paddingTop: windowWidth <= 640 ? '8px' : '10px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#8884d8" 
                    name="Temperatura (°C)"
                    isAnimationActive={true}
                    animationDuration={600}
                    animationEasing="ease-in-out"
                    dot={{ r: windowWidth <= 640 ? 3 : 4 }}
                    activeDot={{ r: windowWidth <= 640 ? 5 : 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="#82ca9d" 
                    name="Umidade (%)"
                    isAnimationActive={true}
                    animationDuration={600}
                    animationEasing="ease-in-out"
                    dot={{ r: windowWidth <= 640 ? 3 : 4 }}
                    activeDot={{ r: windowWidth <= 640 ? 5 : 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Velocidade do Vento</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{windChartData.length} pontos de dados históricos</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Intervalo:</span>
                  <div className="flex flex-wrap gap-1 border rounded-md p-1 w-full sm:w-auto">
                    <Button
                      variant={windFilter === '1h' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setWindFilter('1h')}
                      className="h-7 px-2 text-xs flex-1 sm:flex-none"
                    >
                      1h
                    </Button>
                    <Button
                      variant={windFilter === '30min' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setWindFilter('30min')}
                      className="h-7 px-2 text-xs flex-1 sm:flex-none"
                    >
                      30min
                    </Button>
                    <Button
                      variant={windFilter === '5min' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setWindFilter('5min')}
                      className="h-7 px-2 text-xs flex-1 sm:flex-none"
                    >
                      5min
                    </Button>
                    <Button
                      variant={windFilter === '1min' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setWindFilter('1min')}
                      className="h-7 px-2 text-xs flex-1 sm:flex-none"
                    >
                      1min
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-1">
                  <Label htmlFor="wind-date-start" className="text-xs sm:text-sm whitespace-nowrap">Data Inicial:</Label>
                  <Input
                    id="wind-date-start"
                    type="date"
                    value={windDateStart}
                    onChange={(e) => setWindDateStart(e.target.value)}
                    className="h-8 text-xs sm:text-sm w-full sm:w-auto"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-1">
                  <Label htmlFor="wind-date-end" className="text-xs sm:text-sm whitespace-nowrap">Data Final:</Label>
                  <Input
                    id="wind-date-end"
                    type="date"
                    value={windDateEnd}
                    onChange={(e) => setWindDateEnd(e.target.value)}
                    min={windDateStart || undefined}
                    className="h-8 text-xs sm:text-sm w-full sm:w-auto"
                  />
                </div>
                {(windDateStart || windDateEnd) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWindDateStart('');
                      setWindDateEnd('');
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="chart-container">
              <ResponsiveContainer width="100%" height={getChartHeight()}>
                <BarChart 
                  data={windChartData} 
                  margin={getChartMargins(hasMultipleDaysWind)}
                  key={`wind-${windFilter}`}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="uniqueKey"
                    type="category"
                    height={hasMultipleDaysWind ? (windowWidth <= 640 ? 70 : 90) : (windowWidth <= 640 ? 35 : 45)}
                    interval={calculateXAxisInterval(windChartData.length)}
                    tick={<WindCustomTick />}
                    angle={windowWidth <= 640 ? -45 : 0}
                    textAnchor={windowWidth <= 640 ? "end" : "middle"}
                    tickMargin={windowWidth <= 640 ? 8 : 5}
                  />
                  <YAxis width={getYAxisWidth()} />
                  <Tooltip 
                    labelFormatter={(value: any, payload: any[]) => {
                      if (payload && payload.length > 0 && payload[0].payload) {
                        return payload[0].payload.fullDateTime || value;
                      }
                      return value;
                    }}
                    contentStyle={{
                      fontSize: windowWidth <= 640 ? '11px' : '13px',
                      padding: windowWidth <= 640 ? '6px' : '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      fontSize: windowWidth <= 640 ? '10px' : '12px',
                      paddingTop: windowWidth <= 640 ? '8px' : '10px'
                    }}
                  />
                  <Bar 
                    dataKey="windSpeed" 
                    fill="#8884d8" 
                    name="Velocidade do Vento (km/h)"
                    isAnimationActive={true}
                    animationDuration={600}
                    animationEasing="ease-in-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
        </div>
      )}

      {/* Modal de Confirmação de Exportação */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Exportar {exportType?.toUpperCase()}</DialogTitle>
            <DialogDescription>
              Selecione o período de datas para exportar os registros meteorológicos. Deixe em branco para exportar todos os registros.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="export-date-start">Data Inicial (opcional)</Label>
              <Input
                id="export-date-start"
                type="date"
                value={exportDateStart}
                onChange={(e) => setExportDateStart(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="export-date-end">Data Final (opcional)</Label>
              <Input
                id="export-date-end"
                type="date"
                value={exportDateEnd}
                onChange={(e) => setExportDateEnd(e.target.value)}
                min={exportDateStart || undefined}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExportDialogOpen(false);
                setExportDateStart('');
                setExportDateEnd('');
                setExportType(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmExport}>
              Exportar {exportType?.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
