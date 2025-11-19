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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [logsResponse, latestResponse, insightsResponse] = await Promise.all([
        api.get('/weather/logs', { params: { page: 1, limit: 50 } }),
        api.get('/weather/logs/latest'),
        api.get('/weather/insights'),
      ]);

      setWeatherData(logsResponse.data.data.reverse());
      setLatest(latestResponse.data);
      setInsights(insightsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
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
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Weather Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleExportXLSX} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export XLSX
          </Button>
        </div>
      </div>

      {latest && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temperature</CardTitle>
              <Thermometer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest.current.temperature.toFixed(1)}°C</div>
              <p className="text-xs text-muted-foreground">{latest.current.condition}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Humidity</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest.current.humidity.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">Relative humidity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wind Speed</CardTitle>
              <Wind className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest.current.windSpeed.toFixed(1)} km/h</div>
              <p className="text-xs text-muted-foreground">Current wind speed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precipitation</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest.current.precipitation.toFixed(1)} mm</div>
              <p className="text-xs text-muted-foreground">Current precipitation</p>
            </CardContent>
          </Card>
        </div>
      )}

      {insights && (
        <Card>
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
            <CardDescription>Weather analysis and predictions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground">{insights.summary}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Comfort Index</p>
                <p className="text-2xl font-bold">{insights.comfort.index}</p>
                <p className="text-xs text-muted-foreground">{insights.comfort.level}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classification</p>
                <p className="text-2xl font-bold">{insights.classification}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Temperature Trend</p>
                <p className="text-2xl font-bold">{insights.trends.temperature}</p>
                <p className="text-xs text-muted-foreground">
                  {insights.trends.temperatureChange > 0 ? '+' : ''}
                  {insights.trends.temperatureChange.toFixed(1)}°C
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Temperature</p>
                <p className="text-2xl font-bold">{insights.statistics.averageTemperature.toFixed(1)}°C</p>
              </div>
            </div>
            {insights.alerts.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Alerts</h3>
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
              <CardTitle>Temperature & Humidity Trends</CardTitle>
              <CardDescription>Last 50 data points</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="temperature" stroke="#8884d8" name="Temperature (°C)" />
                  <Line type="monotone" dataKey="humidity" stroke="#82ca9d" name="Humidity (%)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wind Speed</CardTitle>
              <CardDescription>Last 50 data points</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="windSpeed" fill="#8884d8" name="Wind Speed (km/h)" />
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
