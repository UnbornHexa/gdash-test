# Painel Meteorológico - Aplicação Full Stack

Uma aplicação full-stack completa que coleta dados meteorológicos, processa através de um sistema de filas, armazena no MongoDB e exibe em um dashboard React moderno com insights alimentados por IA.

## 🏗️ Arquitetura

A aplicação consiste em 5 serviços principais:

1. **Serviço Python** - Coleta dados meteorológicos da API Open-Meteo e publica no RabbitMQ
2. **Worker Go** - Consome mensagens do RabbitMQ e encaminha para a API NestJS
3. **API NestJS** - API backend com MongoDB, autenticação e endpoints meteorológicos
4. **Frontend React** - Dashboard moderno com Vite, Tailwind CSS e shadcn/ui
5. **Infraestrutura** - Containers MongoDB e RabbitMQ

## 🚀 Início Rápido

### Pré-requisitos

- Docker e Docker Compose instalados
- Git

### Executando com Docker Compose

1. Clone o repositório:
```bash
git clone <repository-url>
cd "Renan Orozco"
```

2. Copie as variáveis de ambiente (opcional - padrões estão configurados):
```bash
# O arquivo .env é opcional, os padrões estão configurados no docker-compose.yml
```

3. Inicie todos os serviços:
```bash
docker-compose up -d
```

4. Aguarde todos os serviços ficarem prontos (pode levar alguns minutos na primeira execução)

5. Acesse a aplicação:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000/api
- **Gerenciamento RabbitMQ**: http://localhost:15672 (admin/admin123)
- **MongoDB**: localhost:27017

### Credenciais Padrão

- **E-mail**: admin@example.com
- **Senha**: 123456

## 📦 Detalhes dos Serviços

### Coletor Meteorológico Python

**Localização**: `weather-collector/`

Coleta dados meteorológicos da API Open-Meteo a cada hora (configurável) e publica na fila RabbitMQ.

**⚠️ Importante sobre dados históricos:**
- A API Open-Meteo fornece apenas dados **atuais** e **previsões futuras**
- **Não é possível** recuperar dados históricos de horas/dias anteriores se o sistema não estava coletando no momento
- Os dados históricos disponíveis são **apenas os que foram coletados** desde que o sistema está rodando
- Para ter um histórico completo, o sistema precisa estar rodando continuamente

**Variáveis de Ambiente**:
- `RABBITMQ_URL`: URL de conexão do RabbitMQ
- `WEATHER_API_URL`: URL da API Open-Meteo (padrão: https://api.open-meteo.com/v1/forecast)
- `LATITUDE`: Latitude da localização (padrão: 23.5505 - São Paulo)
- `LONGITUDE`: Longitude da localização (padrão: -46.6333 - São Paulo)
- `COLLECTION_INTERVAL`: Intervalo de coleta em segundos (padrão: 300 = 5 minutos)

**Executando manualmente**:
```bash
cd weather-collector
pip install -r requirements.txt
python main.py
```

### Worker Go

**Localização**: `go-worker/`

Consome dados meteorológicos do RabbitMQ, valida e envia para a API NestJS.

**Variáveis de Ambiente**:
- `RABBITMQ_URL`: URL de conexão do RabbitMQ
- `API_URL`: Endpoint da API NestJS para logs meteorológicos
- `QUEUE_NAME`: Nome da fila RabbitMQ (padrão: weather_data)

**Executando manualmente**:
```bash
cd go-worker
go mod download
go run main.go
```

### API NestJS

**Localização**: `backend/`

API RESTful com as seguintes funcionalidades:
- Armazenamento e recuperação de dados meteorológicos
- Gerenciamento de usuários (CRUD)
- Autenticação JWT
- Insights meteorológicos alimentados por IA
- Exportação CSV/XLSX
- Integração opcional com API Pokemon

**Endpoints**:

#### Meteorologia
- `POST /api/weather/logs` - Criar log meteorológico (usado pelo worker Go)
- `GET /api/weather/logs` - Listar logs meteorológicos (paginado)
- `GET /api/weather/logs/latest` - Obter dados meteorológicos mais recentes
- `GET /api/weather/logs/:id` - Obter log meteorológico específico
- `GET /api/weather/insights` - Obter insights gerados por IA
- `GET /api/weather/export/csv` - Exportar dados meteorológicos como CSV
- `GET /api/weather/export/xlsx` - Exportar dados meteorológicos como XLSX
- `DELETE /api/weather/logs/:id` - Excluir log meteorológico

#### Autenticação
- `POST /api/auth/login` - Fazer login e obter token JWT

#### Usuários
- `GET /api/users` - Listar todos os usuários
- `POST /api/users` - Criar novo usuário
- `GET /api/users/:id` - Obter usuário por ID
- `PATCH /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Excluir usuário

#### Pokemon (Opcional)
- `GET /api/pokemon` - Listar Pokémon (paginado)
- `GET /api/pokemon/:id` - Obter detalhes do Pokémon

**Variáveis de Ambiente**:
- `MONGODB_URI`: String de conexão do MongoDB
- `JWT_SECRET`: Chave secreta para tokens JWT
- `PORT`: Porta da API (padrão: 3000)
- `DEFAULT_USER_EMAIL`: E-mail do administrador padrão
- `DEFAULT_USER_PASSWORD`: Senha do administrador padrão

**Executando manualmente**:
```bash
cd backend
npm install
npm run start:dev
```

### Frontend React

**Localização**: `frontend/`

Aplicação React moderna com:
- Dashboard meteorológico com dados em tempo real
- Visualização de insights de IA
- Interface de gerenciamento de usuários
- Explorador de Pokemon (opcional)
- Funcionalidade de exportação CSV/XLSX

**Páginas**:
- `/` - Dashboard com dados meteorológicos e insights
- `/users` - Gerenciamento de usuários (CRUD)
- `/pokemon` - Explorador de Pokemon com paginação

**Variáveis de Ambiente**:
- `VITE_API_URL`: URL da API backend (padrão: http://localhost:3000/api)

**Executando manualmente**:
```bash
cd frontend
npm install
npm run dev
```

## 🔄 Fluxo de Dados

1. **Serviço Python** → Coleta dados meteorológicos da API Open-Meteo
2. **Serviço Python** → Publica dados na fila RabbitMQ (`weather_data`)
3. **Worker Go** → Consome mensagens do RabbitMQ
4. **Worker Go** → Valida e encaminha dados para a API NestJS
5. **API NestJS** → Armazena dados no MongoDB
6. **Frontend React** → Busca dados da API NestJS e exibe

## 🤖 Insights de IA

O sistema gera insights alimentados por IA a partir de dados meteorológicos incluindo:
- Análise estatística (médias, mín/máx)
- Tendências de temperatura (subindo/descendo)
- Índice de conforto (escala 0-100)
- Classificação do clima (Frio, Quente, Agradável, Chuvoso, etc.)
- Alertas automatizados (temperaturas extremas, alta umidade, etc.)
- Resumos em linguagem natural

Os insights são gerados usando o endpoint `/api/weather/insights` e podem ser acionados:
- Automaticamente quando novos dados chegam
- Sob demanda via frontend
- Com limites personalizados para pontos de dados analisados

## 📊 Funcionalidades

### Dashboard Meteorológico
- Exibição de dados meteorológicos em tempo real
- Cards de temperatura, umidade, velocidade do vento e precipitação
- Gráficos interativos (tendências de temperatura, umidade, velocidade do vento)
- Painel de insights de IA com estatísticas e alertas
- Funcionalidade de exportação (CSV/XLSX)

### Gerenciamento de Usuários
- Operações CRUD completas
- Autenticação baseada em JWT
- Criação de usuário administrador padrão na inicialização
- Ativação/desativação de usuários

### Explorador de Pokemon (Opcional)
- Navegar por Pokémon com paginação
- Visualizar informações detalhadas do Pokémon
- Exibição de tipos, habilidades e estatísticas

## 🐳 Serviços Docker

O `docker-compose.yml` define os seguintes serviços:

- **mongodb**: Banco de dados MongoDB 7
- **rabbitmq**: RabbitMQ com interface de gerenciamento
- **api**: API backend NestJS
- **weather-collector**: Coletor de dados meteorológicos Python
- **go-worker**: Worker Go para RabbitMQ
- **frontend**: Aplicação frontend React

Todos os serviços estão interconectados via redes Docker e configurados com dependências apropriadas.

## 🔧 Desenvolvimento

### Desenvolvimento Backend

```bash
cd backend
npm install
npm run start:dev  # Modo watch
npm run build      # Build de produção
npm run lint       # Verificar código
```

### Desenvolvimento Frontend

```bash
cd frontend
npm install
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção
npm run lint       # Verificar código
```

### Desenvolvimento Worker Go

```bash
cd go-worker
go mod download
go run main.go
```

### Desenvolvimento Serviço Python

```bash
cd weather-collector
pip install -r requirements.txt
python main.py
```

## 📝 Variáveis de Ambiente

Crie um arquivo `.env` no diretório raiz (opcional):

```env
# Segredo JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# MongoDB
MONGODB_URI=mongodb://admin:admin123@localhost:27017/weather_db?authSource=admin

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# API Meteorológica
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast
LATITUDE=23.5505
LONGITUDE=-46.6333
COLLECTION_INTERVAL=300

# API NestJS
PORT=3000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3000/api

# Usuário Padrão
DEFAULT_USER_EMAIL=admin@example.com
DEFAULT_USER_PASSWORD=123456
```

## 🧪 Testes

### Testes de Endpoints da API

Use ferramentas como Postman, cURL ou a aplicação frontend para testar endpoints.

Exemplo de login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"123456"}'
```

Exemplo de obtenção de logs meteorológicos (requer autenticação):
```bash
curl -X GET http://localhost:3000/api/weather/logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📦 Tecnologias Utilizadas

### Backend
- **NestJS** - Framework Node.js progressivo
- **MongoDB** - Banco de dados NoSQL
- **Mongoose** - Modelagem de objetos MongoDB
- **JWT** - Autenticação
- **ExcelJS** - Geração de arquivos Excel
- **TypeScript** - JavaScript com tipagem

### Frontend
- **React** - Biblioteca UI
- **Vite** - Ferramenta de build
- **TypeScript** - JavaScript com tipagem
- **Tailwind CSS** - CSS utilitário
- **shadcn/ui** - Componentes UI
- **Recharts** - Biblioteca de gráficos
- **React Router** - Roteamento

### Coleta e Processamento de Dados
- **Python** - Coleta de dados meteorológicos
- **Go** - Worker RabbitMQ
- **RabbitMQ** - Fila de mensagens
- **API Open-Meteo** - Fonte de dados meteorológicos

### Infraestrutura
- **Docker** - Containerização
- **Docker Compose** - Orquestração multi-container

## 🐛 Solução de Problemas

### Serviços não estão iniciando
- Verifique os logs do Docker: `docker-compose logs [service-name]`
- Certifique-se de que as portas não estão em uso
- Verifique se o Docker tem recursos suficientes alocados

### Problemas de conexão com o banco de dados
- Aguarde o MongoDB ficar totalmente pronto (pode levar 30-60 segundos)
- Verifique as credenciais do MongoDB no docker-compose.yml
- Verifique a conectividade de rede entre serviços

### Frontend não está conectando à API
- Certifique-se de que a API está rodando e acessível
- Verifique a variável de ambiente `VITE_API_URL`
- Verifique as configurações de CORS no NestJS (main.ts)

### Dados meteorológicos não estão aparecendo
- Verifique os logs do coletor Python: `docker-compose logs weather-collector`
- Verifique se o RabbitMQ está rodando: `docker-compose logs rabbitmq`
- Verifique os logs do worker Go: `docker-compose logs go-worker`
- Certifique-se de que a API está recebendo dados: `docker-compose logs api`

### Por que não vejo dados de horas/dias anteriores?
- A API Open-Meteo **não fornece dados históricos** do passado
- Apenas dados coletados desde que o sistema está rodando estarão disponíveis
- Se o sistema ficou parado, não haverá dados do período parado
- **Solução**: Mantenha o sistema rodando continuamente para construir um histórico completo

### Problemas ao construir imagens Docker (timeout, erro de conexão)

Se você encontrar erros como `TLS handshake timeout` ou `failed to resolve source metadata` ao construir as imagens:

**Solução 1: Pull manual das imagens base**
```bash
# Baixe as imagens base manualmente antes de construir
docker pull node:20-alpine
docker pull mongo:7
docker pull rabbitmq:3-management
docker pull golang:1.21-alpine
docker pull alpine:latest
docker pull python:3.11-slim

# Depois tente construir novamente
docker-compose build
```

**Solução 2: Verificar conectividade com Docker Hub**
```bash
# Teste a conectividade com Docker Hub
curl -I https://registry-1.docker.io/v2/

# Verifique as configurações de DNS do Docker
docker info | grep -i dns
```

**Solução 3: Reconstruir apenas o serviço com problema**
```bash
# Se apenas um serviço falhar, reconstrua apenas ele
docker-compose build frontend  # ou api, go-worker, etc.
```

**Solução 4: Limpar cache e tentar novamente**
```bash
# Limpe o cache de build do Docker e tente novamente
docker builder prune -f
docker-compose build --no-cache
```

**Solução 5: Configurar mirror registry (se disponível)**
Se você estiver em uma região com acesso limitado ao Docker Hub, configure um mirror registry no arquivo `/etc/docker/daemon.json` (Linux) ou nas configurações do Docker Desktop (Windows/Mac).

**Nota**: Os erros de timeout geralmente são temporários e relacionados à conectividade de rede. Aguarde alguns minutos e tente novamente.

## 📄 Licença

Este projeto foi criado para fins educacionais/demonstrativos.

## 👤 Autor

Renan Orozco

---

## 🎥 Demonstração em Vídeo

[Link do vídeo será adicionado aqui]

O vídeo deve demonstrar:
- Visão geral da arquitetura
- Fluxo do pipeline de dados (Python → RabbitMQ → Go → NestJS → Frontend)
- Geração de insights de IA
- Principais funcionalidades (Dashboard, Usuários, Pokemon)
- Execução do Docker Compose

## ✅ Checklist

- ✅ Python coleta dados meteorológicos (Open-Meteo)
- ✅ Python envia dados para RabbitMQ
- ✅ Worker Go consome do RabbitMQ e encaminha para NestJS
- ✅ NestJS armazena dados no MongoDB
- ✅ NestJS expõe endpoints meteorológicos
- ✅ NestJS gera insights de IA
- ✅ NestJS exporta CSV/XLSX
- ✅ NestJS implementa CRUD de usuários + autenticação
- ✅ NestJS integra com API Pokemon (opcional)
- ✅ Frontend React com Vite + Tailwind + shadcn/ui
- ✅ Dashboard exibe dados meteorológicos e insights
- ✅ Interface de gerenciamento de usuários
- ✅ Página exploradora de Pokemon
- ✅ Docker Compose orquestra todos os serviços
- ✅ TypeScript no backend e frontend
- ✅ README completo
