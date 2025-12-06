#!/usr/bin/env python3
"""
Serviço de Coleta de Dados Meteorológicos
Coleta dados meteorológicos da API Open-Meteo para cada usuário e envia para RabbitMQ
"""

import os
import time
import json
import requests
import pika
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class WeatherCollector:
    def __init__(self):
        self.weather_api_url = os.getenv('WEATHER_API_URL', 'https://api.open-meteo.com/v1/forecast')
        self.api_url = os.getenv('API_URL', 'http://api:3000/api')  # URL da API NestJS
        self.rabbitmq_url = os.getenv('RABBITMQ_URL', 'amqp://admin:admin123@localhost:5672')
        self.collection_interval = int(os.getenv('COLLECTION_INTERVAL', '60'))  # Padrão: 1 minuto (60 segundos)
        self.queue_name = 'weather_data'
        
        # Parse da URL do RabbitMQ
        self.rabbitmq_params = pika.URLParameters(self.rabbitmq_url)
        
    def collect_weather_data(self):
        """Coleta dados meteorológicos da API Open-Meteo"""
        try:
            params = {
                'latitude': self.latitude,
                'longitude': self.longitude,
                'current': [
                    'temperature_2m',
                    'relative_humidity_2m',
                    'wind_speed_10m',
                    'weather_code',
                    'precipitation'
                ],
                'hourly': [
                    'temperature_2m',
                    'relative_humidity_2m',
                    'wind_speed_10m',
                    'weather_code',
                    'precipitation_probability'
                ],
                'timezone': 'America/Sao_Paulo'
            }
            
            response = requests.get(self.weather_api_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Extrai o clima atual
            current = data.get('current', {})
            hourly = data.get('hourly', {})
            
            weather_data = {
                'timestamp': datetime.utcnow().isoformat(),
                'location': {
                    'latitude': self.latitude,
                    'longitude': self.longitude
                },
                'current': {
                    'temperature': current.get('temperature_2m'),
                    'humidity': current.get('relative_humidity_2m'),
                    'windSpeed': current.get('wind_speed_10m'),
                    'weatherCode': current.get('weather_code'),
                    'precipitation': current.get('precipitation', 0)
                },
                'forecast': {
                    'time': hourly.get('time', [])[:24],  # Próximas 24 horas
                    'temperature': hourly.get('temperature_2m', [])[:24],
                    'humidity': hourly.get('relative_humidity_2m', [])[:24],
                    'windSpeed': hourly.get('wind_speed_10m', [])[:24],
                    'weatherCode': hourly.get('weather_code', [])[:24],
                    'precipitationProbability': hourly.get('precipitation_probability', [])[:24]
                }
            }
            
            # Mapeia código meteorológico para condição
            weather_codes = {
                0: 'clear', 1: 'mainly_clear', 2: 'partly_cloudy', 3: 'overcast',
                45: 'foggy', 48: 'depositing_rime_fog',
                51: 'light_drizzle', 53: 'moderate_drizzle', 55: 'dense_drizzle',
                56: 'light_freezing_drizzle', 57: 'dense_freezing_drizzle',
                61: 'slight_rain', 63: 'moderate_rain', 65: 'heavy_rain',
                66: 'light_freezing_rain', 67: 'heavy_freezing_rain',
                71: 'slight_snow', 73: 'moderate_snow', 75: 'heavy_snow',
                77: 'snow_grains', 80: 'slight_rain_showers', 81: 'moderate_rain_showers',
                82: 'violent_rain_showers', 85: 'slight_snow_showers', 86: 'heavy_snow_showers',
                95: 'thunderstorm', 96: 'thunderstorm_with_slight_hail', 99: 'thunderstorm_with_heavy_hail'
            }
            
            weather_code = current.get('weather_code', 0)
            weather_data['current']['condition'] = weather_codes.get(weather_code, 'unknown')
            
            return weather_data
            
        except requests.exceptions.RequestException as e:
            print(f"Erro ao buscar dados meteorológicos: {e}")
            return None
        except Exception as e:
            print(f"Erro inesperado: {e}")
            return None
    
    def send_to_rabbitmq(self, data):
        """Envia dados meteorológicos para a fila RabbitMQ"""
        try:
            connection = pika.BlockingConnection(self.rabbitmq_params)
            channel = connection.channel()
            
            # Declara fila (durável)
            channel.queue_declare(queue=self.queue_name, durable=True)
            
            # Publica mensagem
            message = json.dumps(data)
            channel.basic_publish(
                exchange='',
                routing_key=self.queue_name,
                body=message,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Torna mensagem persistente
                )
            )
            
            print(f"[{datetime.now()}] Dados meteorológicos enviados para RabbitMQ")
            connection.close()
            return True
            
        except Exception as e:
            print(f"Erro ao enviar para RabbitMQ: {e}")
            return False
    
    def wait_until_next_minute(self):
        """Aguarda até o início do próximo minuto"""
        now = datetime.now()
        # Calcula quantos segundos faltam para o próximo minuto
        seconds_until_next_minute = 60 - now.second
        if seconds_until_next_minute > 0:
            time.sleep(seconds_until_next_minute)
    
    def run(self):
        """Loop principal"""
        print("Serviço Coletor Meteorológico Iniciado")
        print(f"Coletando dados meteorológicos a cada {self.collection_interval} segundos")
        print(f"API URL: {self.api_url}")
        
        # Sincroniza com o início do próximo minuto na primeira execução
        if self.collection_interval == 60:
            print("Sincronizando com o início do próximo minuto...")
            self.wait_until_next_minute()
            print(f"Coletando dados agora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        while True:
            try:
                # Busca usuários com localizações
                users = self.get_users_with_locations()
                
                if not users:
                    print("⚠️ Nenhum usuário com localização encontrado. Aguardando...")
                else:
                    print(f"📋 Encontrados {len(users)} usuário(s) com localização")
                    
                    # Coleta dados para cada usuário
                    for user in users:
                        location = user.get('location')
                        if not location:
                            continue
                            
                        latitude = location.get('latitude')
                        longitude = location.get('longitude')
                        user_email = user.get('email', 'desconhecido')
                        user_name = user.get('name', user_email)
                        
                        if latitude is None or longitude is None:
                            print(f"⚠️ Usuário {user_name} não tem localização válida")
                            continue
                        
                        print(f"🌤️ Coletando dados para {user_name} ({latitude}, {longitude})...")
                        weather_data = self.collect_weather_data_for_location(latitude, longitude)
                        
                        if weather_data:
                            # Envia para RabbitMQ
                            if self.send_to_rabbitmq(weather_data):
                                current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                print(f"  ✅ [{current_time}] Dados coletados para {user_name}:")
                                print(f"     Temperatura: {weather_data['current']['temperature']}°C")
                                print(f"     Umidade: {weather_data['current']['humidity']}%")
                                print(f"     Velocidade do Vento: {weather_data['current']['windSpeed']} km/h")
                                print(f"     Condição: {weather_data['current']['condition']}")
                            else:
                                print(f"  ❌ Erro ao enviar dados para RabbitMQ (usuário: {user_name})")
                        else:
                            print(f"  ❌ Erro ao coletar dados (usuário: {user_name})")
                
                # Se o intervalo for 60 segundos, sincroniza com o próximo minuto
                if self.collection_interval == 60:
                    self.wait_until_next_minute()
                else:
                    # Para outros intervalos, usa sleep normal
                    time.sleep(self.collection_interval)
                
            except KeyboardInterrupt:
                print("\nEncerrando...")
                break
            except Exception as e:
                print(f"Erro no loop principal: {e}")
                import traceback
                traceback.print_exc()
                time.sleep(60)  # Aguarda antes de tentar novamente

if __name__ == '__main__':
    collector = WeatherCollector()
    collector.run()
