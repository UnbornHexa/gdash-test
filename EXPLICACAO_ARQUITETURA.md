# Explicação da Arquitetura - Painel Meteorológico

## 1. Arquitetura Geral da Aplicação

### Visão Geral
A aplicação é um **sistema distribuído full-stack** composto por **5 serviços principais**, seguindo uma arquitetura de microserviços comunicando-se através de um message broker:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Python    │────▶│   RabbitMQ   │────▶│  Go Worker  │────▶│  NestJS API  │────▶│   Frontend  │
│  Collector  │     │ (Message     │     │             │     │              │     │    React    │
│             │     │  Broker)     │     │             │     │              │     │             │
└─────────────┘     └──────────────┘     └─────────────┘     └──────┬───────┘     └─────────────┘
                                                                      │
                                                                      ▼
                                                              ┌──────────────┐
                                                              │   MongoDB    │
                                                              │  (Database)  │
                                                              └──────────────┘
```

### Componentes da Arquitetura

#### 1.1. Serviço Python (Weather Collector)
- **Função**: Coleta dados meteorológicos da API Open-Meteo
- **Localização**: `weather-collector/main.py`
- **Tecnologia**: Python 3.11
- **Responsabilidades**:
  - Consulta a API Open-Meteo a cada 60 segundos (configurável)
  - Coleta dados atuais (temperatura, umidade, vento, precipitação)
  - Coleta previsões horárias (próximas 24 horas)
  - Coleta previsões diárias (próximos 7 dias)
  - Busca usuários com localização cadastrada na API NestJS
  - Publica dados coletados na fila RabbitMQ (`weather_data`)

#### 1.2. RabbitMQ (Message Broker)
- **Função**: Sistema de filas para comunicação assíncrona
- **Tecnologia**: RabbitMQ 3 com Management Plugin
- **Responsabilidades**:
  - Garantir que mensagens não sejam perdidas (mensagens persistentes)
  - Desacoplar o coletor Python do processador Go
  - Permitir escalabilidade horizontal (múltiplos workers Go)
  - Gerenciar filas duráveis para resiliência

#### 1.3. Worker Go
- **Função**: Processa mensagens do RabbitMQ e encaminha para a API NestJS
- **Localização**: `go-worker/main.go`
- **Tecnologia**: Go 1.21
- **Responsabilidades**:
  - Consumir mensagens da fila RabbitMQ
  - Validar dados meteorológicos (temperatura, umidade, etc.)
  - Implementar retry automático (3 tentativas)
  - Encaminhar dados validados para a API NestJS via HTTP POST
  - Gerenciar reconexão em caso de falha

#### 1.4. API NestJS (Backend)
- **Função**: API RESTful central do sistema
- **Localização**: `backend/src/`
- **Tecnologia**: NestJS (Node.js + TypeScript)
- **Responsabilidades**:
  - Receber e armazenar logs meteorológicos no MongoDB
  - Gerenciar usuários (CRUD completo)
  - Autenticação JWT
  - Gerar insights de IA a partir dos dados
  - Exportar dados (CSV/XLSX) com filtros de período
  - Integração opcional com API Pokemon
  - Endpoints de localização (países, estados, cidades)

#### 1.5. Frontend React
- **Função**: Interface do usuário
- **Localização**: `frontend/src/`
- **Tecnologia**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Responsabilidades**:
  - Dashboard meteorológico em tempo real
  - Visualização de dados com gráficos interativos (Recharts)
  - Exibir insights e alertas de IA
  - Gerenciamento de usuários
  - Explorador de Pokemon
  - Layout responsivo (mobile-first)

#### 1.6. MongoDB
- **Função**: Banco de dados NoSQL
- **Tecnologia**: MongoDB 7
- **Armazena**:
  - Logs meteorológicos (com timestamps e localização)
  - Dados de usuários
  - Previsões futuras (horárias e diárias)

---

## 2. Pipeline de Dados

### Fluxo Completo: Python → Message Broker → Go → NestJS → Frontend

#### Etapa 1: Coleta (Python)
1. **Início do Loop**:
   - O serviço Python executa em loop infinito a cada 60 segundos
   - Busca usuários com localização cadastrada via endpoint `/api/users/with-locations`

2. **Coleta de Dados Meteorológicos**:
   - Para cada usuário, faz requisição para API Open-Meteo
   - Parâmetros coletados:
     - **Dados atuais**: temperatura, umidade, velocidade do vento, código meteorológico, precipitação
     - **Previsões horárias**: próximas 24 horas (temperatura, umidade, vento, probabilidade de chuva)
     - **Previsões diárias**: próximos 7 dias (temperatura máx/mín, precipitação, vento máximo)

3. **Formatação e Publicação**:
   - Estrutura os dados em formato JSON
   - Mapeia códigos meteorológicos para condições legíveis (ex: 0 = "clear", 65 = "heavy_rain")
   - Publica mensagem na fila RabbitMQ `weather_data` como mensagem persistente

**Código chave** (`weather-collector/main.py`):
```python
def send_to_rabbitmq(self, data):
    channel.queue_declare(queue=self.queue_name, durable=True)
    channel.basic_publish(
        exchange='',
        routing_key=self.queue_name,
        body=json.dumps(data),
        properties=pika.BasicProperties(delivery_mode=2)  # Persistente
    )
```

#### Etapa 2: Message Broker (RabbitMQ)
- **Fila**: `weather_data` (durável)
- **Mensagens**: Persistentes (sobrevivem a reinicializações)
- **Formato**: JSON com estrutura padronizada
- **Vantagens**:
  - Desacoplamento: Python não precisa esperar processamento
  - Resiliência: Mensagens não são perdidas se Go Worker estiver offline
  - Escalabilidade: Múltiplos workers Go podem consumir em paralelo

#### Etapa 3: Processamento (Go Worker)
1. **Consumo de Mensagens**:
   - Worker Go conecta-se ao RabbitMQ e registra como consumer da fila `weather_data`
   - Aguarda mensagens de forma assíncrona

2. **Validação**:
   - Deserializa JSON para struct `WeatherData`
   - Valida campos obrigatórios (timestamp, localização)
   - Valida ranges de valores:
     - Temperatura: -100°C a 100°C
     - Umidade: 0% a 100%
     - Velocidade do vento: ≥ 0 km/h

3. **Envio para API NestJS**:
   - Faz POST HTTP para `/api/weather/logs`
   - Implementa retry com backoff exponencial (até 3 tentativas)
   - Em caso de sucesso: confirma mensagem (ACK)
   - Em caso de falha após tentativas: reenfileira mensagem (NACK)

**Código chave** (`go-worker/main.go`):
```go
func (w *Worker) processMessage(delivery amqp.Delivery) {
    // Deserializa
    var weatherData WeatherData
    json.Unmarshal(delivery.Body, &weatherData)
    
    // Valida
    if !w.validateWeatherData(&weatherData) {
        delivery.Nack(false, false) // Rejeita mensagem inválida
        return
    }
    
    // Envia com retry
    maxRetries := 3
    for i := 0; i < maxRetries; i++ {
        if err := w.sendToAPI(&weatherData); err == nil {
            delivery.Ack(false) // Confirma sucesso
            return
        }
        time.Sleep(time.Duration(i+1) * time.Second)
    }
    delivery.Nack(false, true) // Reenfileira para tentar novamente
}
```

#### Etapa 4: Armazenamento (NestJS API)
1. **Recebimento**:
   - Endpoint `POST /api/weather/logs` recebe dados do Go Worker
   - Valida estrutura via DTO (`CreateWeatherLogDto`)

2. **Persistência no MongoDB**:
   - Cria documento no collection `weatherlogs`
   - Armazena:
     - Timestamp (ISO 8601)
     - Localização (latitude, longitude)
     - Dados atuais (current)
     - Previsões horárias (forecast) - opcional
     - Previsões diárias (dailyForecast) - opcional
   - Indexação automática por timestamp e localização para queries rápidas

**Schema MongoDB** (`backend/src/weather/schemas/weather-log.schema.ts`):
```typescript
@Schema({ timestamps: true })
export class WeatherLog {
  timestamp: string;
  location: { latitude: number; longitude: number };
  current: { temperature, humidity, windSpeed, condition, precipitation };
  forecast?: { time[], temperature[], humidity[], ... };
  dailyForecast?: { time[], temperatureMax[], temperatureMin[], ... };
}
```

#### Etapa 5: Visualização (Frontend React)
1. **Busca de Dados**:
   - Frontend faz polling a cada 10 segundos
   - Busca dados atuais via `/api/weather/current` (latitude/longitude do usuário)
   - Busca histórico via `/api/weather/logs` (paginado, filtrado por localização)
   - Busca insights via `/api/weather/insights`

2. **Renderização**:
   - Cards de dados atuais (temperatura, umidade, vento, precipitação)
   - Gráficos interativos (Recharts) com filtros de intervalo (1min, 5min, 30min, 1h)
   - Filtros de período (data inicial/final)
   - Exibição de insights e alertas
   - Limitação inteligente: 15 pontos (mobile), 30 pontos (desktop)

**Código chave** (`frontend/src/pages/Dashboard.tsx`):
```typescript
// Polling automático
useEffect(() => {
  intervalRef.current = setInterval(() => {
    fetchData();
  }, 10000); // Atualiza a cada 10 segundos
}, [userLocation]);
```

---

## 3. Como os Insights de IA São Gerados e Exibidos

### Visão Geral
Os insights **NÃO utilizam IA externa** (como OpenAI/Claude). São **análises estatísticas e regras baseadas em conhecimento meteorológico** implementadas no backend NestJS.

### Geração de Insights (`backend/src/weather/insights.service.ts`)

#### 3.1. Coleta de Dados
1. **Busca Logs Históricos**:
   - Endpoint `/api/weather/insights` recebe parâmetros:
     - `limit`: Quantidade de logs a analisar (padrão: 50)
     - `latitude` e `longitude`: Filtrar logs por localização
   - Busca os N logs mais recentes do MongoDB
   - Filtra por localização se fornecida (tolerância de 0.01 graus ≈ 1km)

2. **Busca Dados Atuais**:
   - Se latitude/longitude fornecidas, também busca dados em tempo real da API Open-Meteo
   - Combina dados históricos + dados atuais para análise completa

#### 3.2. Análise Estatística
**Cálculos realizados**:
- **Temperatura**: Média, mínima, máxima
- **Umidade**: Média
- **Velocidade do vento**: Média
- **Tendência de temperatura**: Compara 10 registros mais recentes vs. anteriores
  - Se temperatura recente > antiga → "Subindo"
  - Se temperatura recente < antiga → "Descendo"
  - Caso contrário → "Estável"

**Código**:
```typescript
const recentTemps = temperatures.slice(0, Math.min(10, temperatures.length));
const olderTemps = temperatures.slice(10);
const recentAvg = calculateAverage(recentTemps);
const olderAvg = calculateAverage(olderTemps);
const temperatureTrend = recentAvg > olderAvg ? 'subindo' : 
                         recentAvg < olderAvg ? 'descendo' : 'estável';
```

#### 3.3. Índice de Conforto
**Cálculo baseado em múltiplos fatores** (escala 0-100):

1. **Temperatura** (faixa ideal: 18-25°C):
   - Fora de -10°C a 35°C: -40 pontos
   - Entre -15°C a 30°C: -20 pontos
   - Entre -18°C a 25°C: -10 pontos

2. **Umidade** (faixa ideal: 40-60%):
   - < 20% ou > 80%: -20 pontos
   - Entre 30-70%: -10 pontos

3. **Velocidade do vento** (faixa ideal: 5-15 km/h):
   - > 30 km/h: -15 pontos
   - > 20 km/h: -10 pontos
   - < 2 km/h: -5 pontos

**Níveis de conforto**:
- 80-100: Muito Confortável
- 60-79: Confortável
- 40-59: Moderado
- 20-39: Desconfortável
- 0-19: Muito Desconfortável

#### 3.4. Classificação do Clima
**Regras baseadas em condições**:
- **Chuvoso**: Se códigos meteorológicos indicam chuva
- **Frio**: Temperatura média < 10°C
- **Quente**: Temperatura média > 30°C
- **Agradável**: 20-28°C + 40-60% umidade
- **Moderado**: Caso padrão

#### 3.5. Alertas Automatizados
**Sistema de alertas baseado em thresholds**:

1. **Temperatura Alta**:
   - > 35°C: "Alerta de Alta Temperatura: Calor extremo detectado"
   - > 30°C: "Aviso de Alta Temperatura: Condições quentes"

2. **Temperatura Baixa**:
   - < 5°C: "Alerta de Baixa Temperatura: Frio extremo detectado"
   - < 10°C: "Aviso de Baixa Temperatura: Condições frias"

3. **Alta Umidade**:
   - > 80%: "Aviso de Alta Umidade: Condições muito úmidas"

4. **Precipitação**:
   - > 5mm: "Alerta de Precipitação: Chuva forte esperada"

5. **Vento Forte**:
   - > 30 km/h: "Aviso de Vento Forte: Ventos fortes detectados"

#### 3.6. Previsões Futuras
**Análise de previsões diárias** (próximos 7 dias):

1. **Chuva Forte**:
   - Detecta códigos meteorológicos de chuva forte (65, 82, 95, 96, 99)
   - OU precipitação > 10mm
   - OU probabilidade > 70%
   - Formato: "Chuva forte esperada no dia DD/MM, dia-da-semana"

2. **Muito Sol**:
   - Códigos limpos (0, 1) + temperatura máxima > 25°C
   - Formato: "Muito sol esperado no dia DD/MM com temperatura máxima de X°C"

3. **Calor Extremo**:
   - Temperatura máxima > 35°C
   - Formato: "Calor extremo esperado no dia DD/MM (máxima: X°C)"

4. **Frio Intenso**:
   - Temperatura mínima < 5°C
   - Formato: "Frio intenso esperado no dia DD/MM (mínima: X°C)"

**Limitação**: Máximo de 5 previsões (remove duplicatas)

#### 3.7. Resumo em Linguagem Natural
**Geração de texto descritivo**:
- Analisa últimos 7 dias (máximo 168 registros, assumindo 1 por hora)
- Cria resumo com 3 seções:
  1. Resumo do clima dos últimos N dias (temperatura média + tendência)
  2. Condições atuais (temperatura, umidade, vento)
  3. Classificação geral

**Exemplo de saída**:
```
Resumo do clima dos últimos 3 dia(s): Temperatura média 22.5°C com tendência Subindo | 
Condições atuais: 24.0°C, 65% de umidade, 12.0 km/h de velocidade do vento | 
Classificação geral: Agradável
```

### Exibição no Frontend

1. **Endpoint**: `GET /api/weather/insights?limit=50&latitude=-23.55&longitude=-46.63`

2. **Componente React** (`frontend/src/pages/Dashboard.tsx`):
   - Busca insights a cada atualização de dados
   - Renderiza:
     - **Estatísticas**: Cards com médias, mín/máx
     - **Índice de Conforto**: Numérico (0-100) + nível descritivo
     - **Tendência**: Texto ("Subindo"/"Descendo"/"Estável") + variação em °C
     - **Classificação**: Texto ("Chuvoso", "Frio", "Quente", etc.)
     - **Alertas**: Lista em laranja (condições extremas)
     - **Previsões Futuras**: Lista em azul (próximos 7 dias)
     - **Resumo**: Texto formatado com labels em negrito

3. **Atualização**: Insights são recalculados a cada requisição, sempre usando os dados mais recentes disponíveis.

---

## 4. Principais Decisões Técnicas

### 4.1. Arquitetura de Microserviços

**Decisão**: Separar em serviços independentes (Python, Go, NestJS)

**Motivos**:
- **Separação de responsabilidades**: Cada serviço tem uma função específica
- **Escalabilidade**: Pode escalar cada serviço independentemente
- **Tecnologia adequada**: Python para scripts de coleta, Go para performance em workers, Node.js para API
- **Resiliência**: Falha em um serviço não derruba todo o sistema

**Trade-offs**:
- ✅ Maior complexidade de deploy (Docker Compose resolve)
- ✅ Comunicação via rede (RabbitMQ adiciona latência mínima)
- ✅ Gerenciamento de múltiplos processos

### 4.2. Message Broker (RabbitMQ)

**Decisão**: Usar RabbitMQ ao invés de comunicação direta HTTP

**Motivos**:
- **Desacoplamento**: Coletor Python não precisa esperar processamento
- **Garantia de entrega**: Mensagens persistentes não são perdidas
- **Escalabilidade**: Múltiplos workers Go podem processar em paralelo
- **Resiliência**: Se API NestJS estiver offline, mensagens ficam na fila

**Alternativas consideradas**:
- ❌ Redis Pub/Sub: Não garante entrega
- ❌ HTTP direto: Acoplamento forte, falhas perdem dados
- ✅ RabbitMQ: Padrão da indústria, confiável

### 4.3. Go para Worker

**Decisão**: Usar Go ao invés de Node.js/Python para o worker

**Motivos**:
- **Performance**: Go é muito rápido para processamento de mensagens
- **Concorrência**: Goroutines eficientes para múltiplas conexões
- **Recursos**: Menor uso de memória que Node.js
- **Binário único**: Fácil deploy (sem dependências)

**Trade-offs**:
- ✅ Curva de aprendizado se equipe não conhece Go
- ✅ Menos bibliotecas que Node.js/Python

### 4.4. MongoDB ao invés de PostgreSQL

**Decisão**: Banco NoSQL para logs meteorológicos

**Motivos**:
- **Flexibilidade de schema**: Previsões podem variar em estrutura
- **Performance em writes**: MongoDB é otimizado para inserções rápidas
- **Documentos aninhados**: Estrutura de dados meteorológicos se encaixa bem (location, current, forecast)
- **Escalabilidade horizontal**: Fácil sharding se necessário

**Indexação**:
- Índice em `timestamp: -1` (ordenar por data decrescente)
- Índice composto em `location.latitude` e `location.longitude` (filtrar por localização)

### 4.5. TypeScript em Todo Stack Frontend/Backend

**Decisão**: TypeScript ao invés de JavaScript puro

**Motivos**:
- **Type safety**: Reduz bugs em tempo de compilação
- **IntelliSense**: Melhor experiência de desenvolvimento
- **Refatoração**: Mais seguro fazer mudanças
- **Documentação**: Types servem como documentação

### 4.6. React com Vite + Tailwind CSS + shadcn/ui

**Decisão**: Stack moderna de frontend

**Motivos**:
- **Vite**: Build extremamente rápido (ao invés de Webpack)
- **Tailwind CSS**: Estilização utilitária, CSS menor em produção
- **shadcn/ui**: Componentes acessíveis e customizáveis (ao invés de Material-UI/MUI)
- **Recharts**: Gráficos leves e responsivos

### 4.7. Autenticação JWT

**Decisão**: JWT ao invés de sessões

**Motivos**:
- **Stateless**: API não precisa armazenar sessões
- **Escalabilidade**: Funciona em múltiplos servidores sem compartilhar estado
- **Mobile-ready**: Tokens funcionam bem em apps móveis
- **Simplicidade**: Não precisa de Redis/banco para sessões

**Implementação**:
- Token expira em 24 horas
- Refresh via novo login
- Proteção de rotas com `JwtAuthGuard`

### 4.8. Polling ao invés de WebSockets

**Decisão**: Frontend atualiza a cada 10 segundos via polling

**Motivos**:
- **Simplicidade**: Não precisa gerenciar conexões WebSocket
- **Compatibilidade**: Funciona em qualquer proxy/firewall
- **Debugging**: Mais fácil debugar requisições HTTP
- **Suficiente**: Dados são coletados a cada 60s, polling de 10s é adequado

**Trade-offs**:
- ❌ Mais requisições HTTP (mas dados são leves)
- ✅ Não precisa gerenciar reconexões WebSocket

### 4.9. Docker Compose para Orquestração

**Decisão**: Containerizar tudo e orquestrar com Docker Compose

**Motivos**:
- **Consistência**: Mesmo ambiente em desenvolvimento e produção
- **Isolamento**: Cada serviço em seu próprio container
- **Simplicidade**: Um comando (`docker-compose up`) inicia tudo
- **Reprodutibilidade**: Qualquer desenvolvedor pode rodar localmente

**Volumes**:
- Hot-reload em desenvolvimento (volumes montados)
- Volumes nomeados para dados persistentes (MongoDB, RabbitMQ)

### 4.10. Variáveis de Ambiente (.env)

**Decisão**: Todas as configurações via variáveis de ambiente

**Motivos**:
- **Segurança**: Credenciais não ficam no código
- **Flexibilidade**: Diferentes configs para dev/staging/prod
- **12-Factor App**: Segue princípios de aplicações modernas

**Arquivo .env**:
- MongoDB: credenciais e porta
- RabbitMQ: credenciais e portas
- API NestJS: JWT secret, porta, usuário padrão
- Weather Collector: URL da API, intervalo
- Frontend: URL da API backend

### 4.11. Insights "Pseudo-IA" (Sem IA Real)

**Decisão**: Análises estatísticas ao invés de modelos de ML/IA externa

**Motivos**:
- **Custo**: APIs de IA (OpenAI, etc.) são caras para uso contínuo
- **Latência**: Análises locais são instantâneas
- **Privacidade**: Dados não saem do nosso servidor
- **Suficiente**: Para uso meteorológico, regras baseadas em conhecimento são efetivas

**Melhorias futuras possíveis**:
- Modelos de ML treinados localmente (TensorFlow.js, scikit-learn)
- Integração opcional com APIs de IA para análises mais complexas

### 4.12. Limitação de Pontos nos Gráficos

**Decisão**: Máximo de 15 pontos (mobile) / 30 pontos (desktop) quando sem filtro de período

**Motivos**:
- **Performance**: Muitos pontos tornam gráficos lentos
- **Legibilidade**: Gráficos com muitos pontos são confusos
- **UX**: Usuário pode usar filtros para ver períodos específicos

**Implementação**:
- Limite aplicado APÓS filtros de intervalo
- Com filtro de período: mostra todos os pontos do período selecionado
- Sem filtro: pega os N mais recentes

---

## Resumo Executivo

### Arquitetura
Sistema distribuído com 5 serviços: Python (coleta), RabbitMQ (broker), Go (worker), NestJS (API), React (frontend), MongoDB (banco).

### Pipeline
Python coleta → RabbitMQ armazena → Go processa → NestJS persiste → Frontend visualiza. Comunicação assíncrona com garantia de entrega.

### Insights
Análises estatísticas locais: tendências, índice de conforto, alertas automáticos, previsões futuras. Sem IA externa (custo/privacidade).

### Decisões Técnicas
Microserviços, RabbitMQ para desacoplamento, Go para performance, MongoDB para flexibilidade, TypeScript para type safety, Docker para deploy, JWT para autenticação stateless.

---

*Documento criado para explicação em vídeo sobre o projeto Painel Meteorológico*

