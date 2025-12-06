# Guia de Deploy no Railway

## Configuração Necessária

O projeto está configurado para deploy no Railway. Siga estes passos:

### 1. No Dashboard do Railway

1. **Criar um novo projeto** no Railway
2. **Adicionar um serviço** e conectar ao repositório Git
3. **⚠️ IMPORTANTE: Configurar o Root Directory**:
   - Vá em **Settings** → **Root Directory**
   - Defina como: `backend`
   - Isso faz com que o Railway olhe dentro do diretório `backend/` para encontrar o `package.json`

### 2. Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no Railway:

#### Obrigatórias:
- `MONGODB_URI` - String de conexão do MongoDB (ex: `mongodb+srv://user:pass@cluster.mongodb.net/weather_db`)
- `JWT_SECRET` - Chave secreta para JWT (gere uma chave forte)
- `PORT` - Porta da aplicação (Railway define automaticamente, mas você pode configurar)
- `NODE_ENV` - `production`

#### Opcionais mas Recomendadas:
- `DEFAULT_USER_EMAIL` - Email do usuário padrão (padrão: `admin@example.com`)
- `DEFAULT_USER_PASSWORD` - Senha do usuário padrão
- `CORS_ORIGINS` - Origens permitidas para CORS (ex: `https://your-frontend.railway.app`)
- `MONGO_ROOT_USERNAME` - Username do MongoDB (se não estiver na URI)
- `MONGO_ROOT_PASSWORD` - Senha do MongoDB (se não estiver na URI)

### 3. Banco de Dados MongoDB

O Railway oferece MongoDB como serviço gerenciado:

1. No projeto Railway, clique em **"New"** → **"Database"** → **"Add MongoDB"**
2. O Railway criará automaticamente uma variável `MONGO_URI` ou `MONGODB_URI`
3. Use essa variável no serviço da API

**OU**

Use MongoDB Atlas (cloud):
1. Crie uma conta em [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie um cluster gratuito
3. Obtenha a connection string
4. Configure como `MONGODB_URI` no Railway

### 4. Deploy

O Railway detectará automaticamente:

- **Se Root Directory = `backend`**: Usará o `package.json` do backend diretamente
- **Se Root Directory = raiz**: Usará os arquivos de configuração na raiz (railway.json, Procfile, package.json)

### 5. Comandos de Build e Start

Com o **Root Directory = `backend`**, o Railway executará:

**Detecção Automática (Nixpacks):**
- Detecta `package.json` no diretório `backend/`
- Instala dependências: `npm ci`
- Faz build: `npm run build`
- Inicia: `node dist/main.js`

**Arquivos de Configuração:**
- `backend/nixpacks.toml` - Configuração do Nixpacks (se necessário)
- `backend/package.json` - Scripts de build e start

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

