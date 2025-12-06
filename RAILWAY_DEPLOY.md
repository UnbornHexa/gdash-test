# Guia de Deploy no Railway

## Configuração Necessária

O projeto está configurado para deploy no Railway. Siga estes passos:

### 1. No Dashboard do Railway

1. **Criar um novo projeto** no Railway
2. **Adicionar um serviço** e conectar ao repositório Git
3. **Root Directory** (escolha uma opção):

   **Opção A: Deixar Root Directory como raiz (recomendado)**
   - Deixe o Root Directory vazio ou como `.` (raiz)
   - Os arquivos `railway.json` e `Procfile` já estão configurados com `cd backend &&` para funcionar da raiz
   - Funciona automaticamente sem configuração adicional

   **Opção B: Configurar Root Directory como `backend`**
   - Vá em **Settings** → **Root Directory**
   - Defina como: `backend`
   - O arquivo `backend/nixpacks.toml` será usado automaticamente

### 2. Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no Railway:

#### Obrigatórias:
- `MONGODB_URI` ou `MONGO_URI` - **CRÍTICO**: String de conexão do MongoDB. 
  - Se usar MongoDB do Railway: O Railway cria automaticamente `MONGO_URI` quando você adiciona MongoDB
  - Se usar MongoDB Atlas: Use `mongodb+srv://user:pass@cluster.mongodb.net/weather_db`
  - Se usar MongoDB externo: Use `mongodb://user:pass@host:port/database`
- `JWT_SECRET` - Chave secreta para JWT (gere uma chave forte)
- `PORT` - Porta da aplicação (Railway define automaticamente via variável `PORT`)
- `NODE_ENV` - `production`

#### Opcionais mas Recomendadas:
- `DEFAULT_USER_EMAIL` - Email do usuário padrão (padrão: `admin@example.com`)
- `DEFAULT_USER_PASSWORD` - Senha do usuário padrão
- `CORS_ORIGINS` - Origens permitidas para CORS (ex: `https://your-frontend.railway.app`)
- `MONGO_ROOT_USERNAME` - Username do MongoDB (se não estiver na URI)
- `MONGO_ROOT_PASSWORD` - Senha do MongoDB (se não estiver na URI)

### 3. Banco de Dados MongoDB ⚠️ CRÍTICO

**O erro `getaddrinfo ENOTFOUND mongodb` significa que a variável `MONGODB_URI` não está configurada!**

#### Opção 1: MongoDB do Railway (Recomendado)

1. No projeto Railway, clique em **"New"** → **"Database"** → **"Add MongoDB"**
2. O Railway criará automaticamente uma variável `MONGO_URI` (ou `MONGODB_URI`)
3. **IMPORTANTE**: Você precisa referenciar essa variável no seu serviço de API:
   - Vá no serviço da API
   - Vá em **Variables**
   - Adicione ou verifique: `MONGODB_URI` = valor de `MONGO_URI` do MongoDB
   - OU renomeie a variável para `MONGODB_URI` no serviço MongoDB

#### Opção 2: MongoDB Atlas (Cloud - Gratuito)

1. Crie uma conta em [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie um cluster gratuito (M0)
3. Configure Network Access: Adicione `0.0.0.0/0` (permite todas as IPs) ou IPs do Railway
4. Configure Database Access: Crie um usuário com senha
5. Obtenha a connection string:
   - Clique em "Connect" → "Connect your application"
   - Copie a string: `mongodb+srv://user:pass@cluster.mongodb.net/`
   - Adicione o nome do banco: `mongodb+srv://user:pass@cluster.mongodb.net/weather_db`
6. No Railway, adicione como variável `MONGODB_URI`

#### Verificação

Após configurar, verifique nos logs que aparece:
- `MONGODB_URI: definida` (não "não definida")
- Não deve aparecer o erro `getaddrinfo ENOTFOUND mongodb`

### 4. Deploy

O Railway detectará automaticamente:

- **Se Root Directory = `backend`**: Usará o `package.json` do backend diretamente
- **Se Root Directory = raiz**: Usará os arquivos de configuração na raiz (railway.json, Procfile, package.json)

### 5. Comandos de Build e Start

**Se Root Directory = raiz (padrão):**
- Build: `cd backend && npm install && npm run build` (via `railway.json`)
- Start: `cd backend && npm run start:prod` (via `Procfile` ou `railway.json`)
- Arquivos usados: `railway.json`, `Procfile` na raiz

**Se Root Directory = `backend`:**
- Build: `npm install && npm run build` (via `backend/nixpacks.toml`)
- Start: `npm run start:prod` (via `backend/nixpacks.toml`)
- Arquivos usados: `backend/nixpacks.toml`, `backend/package.json`

### 6. Verificação

Após o deploy, verifique:

1. **Health Check**: `https://your-app.railway.app/api/health`
2. **API Endpoint**: `https://your-app.railway.app/api`
3. **Logs**: Verifique os logs no Railway para erros

### 7. Troubleshooting

**Erro: "start.sh not found"**
- ✅ Resolvido: O Railway agora usa `Procfile` ou `package.json` scripts

**Erro: "Railpack could not determine how to build the app"**
- ✅ Resolvido: Configure o Root Directory como `backend`
- O Nixpacks detectará automaticamente o Node.js pelo `package.json`

**Erro: "undefined variable 'npm'"**
- ✅ Resolvido: Removido `npm` do array de pacotes Nix
- O npm já vem incluído com `nodejs-18_x` automaticamente

**Erro: "Cannot find module '/app/dist/main.js'"**
- ✅ Resolvido: Mudado para `npm install` (instala devDependencies como @nestjs/cli)
- ✅ Resolvido: Start command usa `npm run start:prod` (executa prestart:prod que faz build automaticamente)

**Erro: `getaddrinfo ENOTFOUND mongodb` ou `Unable to connect to the database`** ⚠️
- **Causa**: A variável `MONGODB_URI` não está configurada no Railway
- **Solução**: Veja seção 3 acima ou arquivo `CONFIGURAR_MONGODB_RAILWAY.md` para guia detalhado
- **Verificação rápida**: Nos logs, deve aparecer `MONGODB_URI: definida` (não "não definida")

**Erro: `MongoServerError: Authentication failed`** 🔐
- **Causa**: A connection string está configurada, mas usuário/senha estão incorretos
- **Soluções**:
  1. Verifique se a connection string do Railway MongoDB está completa e correta
  2. Se a senha tem caracteres especiais (`@`, `#`, `%`), faça URL encoding:
     - `@` → `%40`, `#` → `%23`, `%` → `%25`
  3. Recrie o MongoDB no Railway ou use MongoDB Atlas
- **Veja**: Arquivo `CORRIGIR_AUTH_MONGODB.md` para guia detalhado passo a passo

**Erro de conexão com MongoDB:**
- Verifique se `MONGODB_URI` está configurada corretamente
- Verifique se o IP do Railway está na whitelist do MongoDB Atlas (se aplicável)

**Erro de porta:**
- O Railway define automaticamente a variável `PORT`
- A aplicação já está configurada para usar `process.env.PORT || 3000`

### 8. Deploy do Frontend (Opcional)

Se quiser deployar o frontend também:

1. Crie um novo serviço no Railway
2. Configure Root Directory como: `frontend`
3. Build Command: `npm install && npm run build`
4. Start Command: `npm run preview` (ou configure um servidor estático)

**OU**

Configure o frontend para ser servido como arquivos estáticos:
- Use Vercel, Netlify, ou Cloudflare Pages para o frontend
- Configure `VITE_API_URL` apontando para a API no Railway

## Arquivos de Configuração Criados

- ✅ `package.json` (raiz) - Scripts de build e start
- ✅ `railway.json` - Configuração do Railway
- ✅ `Procfile` - Comando de start para o Railway
- ✅ `nixpacks.toml` - Configuração alternativa de build (Nixpacks)
- ✅ `backend/package.json` - Atualizado com engines e prestart:prod

## Próximos Passos

1. Faça commit e push das mudanças
2. Conecte o repositório no Railway
3. Configure as variáveis de ambiente
4. Deploy automático!

