package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type WeatherData struct {
	Timestamp string `json:"timestamp"`
	Location  struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	} `json:"location"`
	Current struct {
		Temperature   float64 `json:"temperature"`
		Humidity      float64 `json:"humidity"`
		WindSpeed     float64 `json:"windSpeed"`
		WeatherCode   int     `json:"weatherCode"`
		Condition     string  `json:"condition"`
		Precipitation float64 `json:"precipitation"`
	} `json:"current"`
	Forecast struct {
		Time                   []string  `json:"time"`
		Temperature            []float64 `json:"temperature"`
		Humidity               []float64 `json:"humidity"`
		WindSpeed              []float64 `json:"windSpeed"`
		WeatherCode            []int     `json:"weatherCode"`
		PrecipitationProbability []int   `json:"precipitationProbability"`
	} `json:"forecast"`
	DailyForecast struct {
		Time                      []string  `json:"time"`
		WeatherCode               []int     `json:"weatherCode"`
		TemperatureMax            []float64 `json:"temperatureMax"`
		TemperatureMin            []float64 `json:"temperatureMin"`
		PrecipitationSum          []float64 `json:"precipitationSum"`
		PrecipitationProbabilityMax []int   `json:"precipitationProbabilityMax"`
		WindSpeedMax              []float64 `json:"windSpeedMax"`
	} `json:"dailyForecast,omitempty"`
}

type Worker struct {
	rabbitMQURL string
	apiURL      string
	queueName   string
	connection  *amqp.Connection
	channel     *amqp.Channel
}

func NewWorker() (*Worker, error) {
	rabbitMQURL := os.Getenv("RABBITMQ_URL")
	if rabbitMQURL == "" {
		rabbitMQURL = "amqp://admin:admin123@localhost:5672"
	}

	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:3000/api/weather/logs"
	}

	queueName := os.Getenv("QUEUE_NAME")
	if queueName == "" {
		queueName = "weather_data"
	}

	conn, err := amqp.Dial(rabbitMQURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	// Declara fila (durável)
	_, err = ch.QueueDeclare(
		queueName, // nome
		true,      // durável
		false,     // excluir quando não usado
		false,     // exclusivo
		false,     // não aguardar
		nil,       // argumentos
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare queue: %w", err)
	}

	return &Worker{
		rabbitMQURL: rabbitMQURL,
		apiURL:      apiURL,
		queueName:   queueName,
		connection:  conn,
		channel:     ch,
	}, nil
}

func (w *Worker) Close() {
	if w.channel != nil {
		w.channel.Close()
	}
	if w.connection != nil {
		w.connection.Close()
	}
}

func (w *Worker) validateWeatherData(data *WeatherData) bool {
	if data.Timestamp == "" {
		return false
	}
	if data.Current.Temperature < -100 || data.Current.Temperature > 100 {
		return false
	}
	if data.Current.Humidity < 0 || data.Current.Humidity > 100 {
		return false
	}
	if data.Current.WindSpeed < 0 {
		return false
	}
	return true
}

func (w *Worker) sendToAPI(data *WeatherData) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %w", err)
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequest("POST", w.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	log.Printf("Successfully sent weather data to API (Status: %d)", resp.StatusCode)
	return nil
}

func (w *Worker) processMessage(delivery amqp.Delivery) {
	var weatherData WeatherData

	if err := json.Unmarshal(delivery.Body, &weatherData); err != nil {
		log.Printf("Erro ao deserializar mensagem: %v", err)
		delivery.Nack(false, false) // Não reenfileira mensagens inválidas
		return
	}

	// Valida dados
	if !w.validateWeatherData(&weatherData) {
		log.Printf("Dados meteorológicos inválidos: %+v", weatherData)
		delivery.Nack(false, false) // Não reenfileira mensagens inválidas
		return
	}

	// Envia para API com retry
	maxRetries := 3
	for i := 0; i < maxRetries; i++ {
		if err := w.sendToAPI(&weatherData); err != nil {
			log.Printf("Erro ao enviar para API (tentativa %d/%d): %v", i+1, maxRetries, err)
			if i < maxRetries-1 {
				time.Sleep(time.Duration(i+1) * time.Second)
				continue
			}
			// Falhou após tentativas, reenfileira mensagem
			delivery.Nack(false, true)
			return
		}
		// Sucesso
		delivery.Ack(false)
		return
	}
}

func (w *Worker) Start() error {
	log.Println("Go Worker Started")
	log.Printf("RabbitMQ URL: %s", w.rabbitMQURL)
	log.Printf("API URL: %s", w.apiURL)
	log.Printf("Queue: %s", w.queueName)

	msgs, err := w.channel.Consume(
		w.queueName, // fila
		"",          // consumidor
		false,       // auto-ack
		false,       // exclusivo
		false,       // não-local
		false,       // não aguardar
		nil,         // argumentos
	)
	if err != nil {
		return fmt.Errorf("failed to register consumer: %w", err)
	}

	log.Println("Aguardando mensagens. Para sair pressione CTRL+C")

	forever := make(chan bool)

	go func() {
		for d := range msgs {
			log.Printf("Mensagem recebida")
			w.processMessage(d)
		}
	}()

	<-forever
	return nil
}

func main() {
	worker, err := NewWorker()
	if err != nil {
		log.Fatalf("Falha ao criar worker: %v", err)
	}
	defer worker.Close()

	if err := worker.Start(); err != nil {
		log.Fatalf("Erro no worker: %v", err)
	}
}
