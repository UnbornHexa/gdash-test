import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, Cloud, Droplets, Wind, Thermometer } from 'lucide-react';

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

const Dashboard = () => {
  const [weatherData, setWeatherData] = useState<WeatherLog[]>([]);
  const [latest, setLatest] = useState<WeatherLog | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [logsResponse, latestResponse, insightsResponse] = await Promise.all([
        api.get('/weather/logs', { params: { page: 1, limit: 50 } }).catch(() => ({ data: { data: [] } })),
        api.get('/weather/logs/latest').catch(() => ({ data: null })),
        api.get('/weather/insights').catch(() => ({ data: null })),
      ]);

      // Trata dados de logs
      if (logsResponse?.data?.data && Array.isArray(logsResponse.data.data)) {
        setWeatherData([...logsResponse.data.data].reverse());
      } else {
        setWeatherData([]);
      }

      // Trata dados mais recentes
      if (latestResponse?.data) {
        setLatest(latestResponse.data);
      } else {
        setLatest(null);
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
        <h1 className="text-3xl font-bold text-gray-900">Painel Meteorológico</h1>
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
              Nenhum dado meteorológico encontrado. Aguarde alguns minutos enquanto o coletor de dados está em execução.
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
              <p className="text-xs text-muted-foreground">{latest.current.condition}</p>
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
            <CardTitle>Insights de IA</CardTitle>
            <CardDescription>Análise e previsões meteorológicas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Resumo</h3>
              <p className="text-sm text-muted-foreground">{insights.summary}</p>
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
