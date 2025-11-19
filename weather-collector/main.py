#!/usr/bin/env python3
"""
Weather Data Collector Service
Collects weather data from Open-Meteo API and sends to RabbitMQ
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
        self.latitude = float(os.getenv('LATITUDE', '23.5505'))
        self.longitude = float(os.getenv('LONGITUDE', '-46.6333'))
        self.rabbitmq_url = os.getenv('RABBITMQ_URL', 'amqp://admin:admin123@localhost:5672')
        self.collection_interval = int(os.getenv('COLLECTION_INTERVAL', '3600'))
        self.queue_name = 'weather_data'
        
        # Parse RabbitMQ URL
        self.rabbitmq_params = pika.URLParameters(self.rabbitmq_url)
        
    def collect_weather_data(self):
        """Collect weather data from Open-Meteo API"""
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
            
            # Extract current weather
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
                    'time': hourly.get('time', [])[:24],  # Next 24 hours
                    'temperature': hourly.get('temperature_2m', [])[:24],
                    'humidity': hourly.get('relative_humidity_2m', [])[:24],
                    'windSpeed': hourly.get('wind_speed_10m', [])[:24],
                    'weatherCode': hourly.get('weather_code', [])[:24],
                    'precipitationProbability': hourly.get('precipitation_probability', [])[:24]
                }
            }
            
            # Map weather code to condition
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
            print(f"Error fetching weather data: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error: {e}")
            return None
    
    def send_to_rabbitmq(self, data):
        """Send weather data to RabbitMQ queue"""
        try:
            connection = pika.BlockingConnection(self.rabbitmq_params)
            channel = connection.channel()
            
            # Declare queue (durable)
            channel.queue_declare(queue=self.queue_name, durable=True)
            
            # Publish message
            message = json.dumps(data)
            channel.basic_publish(
                exchange='',
                routing_key=self.queue_name,
                body=message,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                )
            )
            
            print(f"[{datetime.now()}] Weather data sent to RabbitMQ")
            connection.close()
            return True
            
        except Exception as e:
            print(f"Error sending to RabbitMQ: {e}")
            return False
    
    def run(self):
        """Main loop"""
        print("Weather Collector Service Started")
        print(f"Collecting weather data every {self.collection_interval} seconds")
        print(f"Location: {self.latitude}, {self.longitude}")
        
        while True:
            try:
                # Collect weather data
                weather_data = self.collect_weather_data()
                
                if weather_data:
                    # Send to RabbitMQ
                    if self.send_to_rabbitmq(weather_data):
                        print(f"Temperature: {weather_data['current']['temperature']}°C")
                        print(f"Humidity: {weather_data['current']['humidity']}%")
                        print(f"Wind Speed: {weather_data['current']['windSpeed']} km/h")
                        print(f"Condition: {weather_data['current']['condition']}")
                
                # Wait for next collection
                time.sleep(self.collection_interval)
                
            except KeyboardInterrupt:
                print("\nShutting down...")
                break
            except Exception as e:
                print(f"Error in main loop: {e}")
                time.sleep(60)  # Wait before retrying

if __name__ == '__main__':
    collector = WeatherCollector()
    collector.run()
