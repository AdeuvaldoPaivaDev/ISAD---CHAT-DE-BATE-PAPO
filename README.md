# Chat Mobile (Expo + Supabase)

App de chat em tempo real feito com **Expo (SDK 52)**, **Expo Router**, **NativeWind** e **Supabase** (mensagens em tempo real, presença online, envio de imagem, áudio e documentos).

## Como rodar localmente

### 1. Pré-requisitos
- Node.js 18+ e um gerenciador de pacotes (`pnpm`, `npm` ou `yarn`)
- App **Expo Go** no celular, ou um emulador Android / simulador iOS

### 2. Instalar dependências
\`\`\`bash
pnpm install        # ou: npm install --legacy-peer-deps
\`\`\`

### 3. Configurar o Supabase
1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor** e rode o conteúdo de [`supabase/setup.sql`](./supabase/setup.sql).
   Isso cria as tabelas, habilita o Realtime, cria o bucket `chat` e insere dois usuários de teste.
3. Em **Settings > API**, copie a `Project URL` e a `anon public key`.

### 4. Variáveis de ambiente
Copie o exemplo e preencha com os seus dados:
\`\`\`bash
cp .env.example .env
\`\`\`
\`\`\`
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
\`\`\`

### 5. Iniciar o app
\`\`\`bash
pnpm start          # abre o Expo Dev Tools
\`\`\`
Escaneie o QR Code com o Expo Go, ou pressione `a` (Android), `i` (iOS) ou `w` (web).

## Login de teste
Após rodar o `setup.sql`, use uma das credenciais inseridas:

> Não há tela de cadastro: novos usuários são adicionados manualmente na tabela `public.users`.

## Estrutura
\`\`\`
app/                 Rotas (Expo Router): login, lista de conversas, chat
components/          Bolha de mensagem, input, player de áudio, avatar
hooks/               Auth, tema, presença, gravação de áudio
lib/                 Cliente Supabase e helpers de formatação
services/            Acesso a dados (usuários, conversas, mensagens, upload)
types/               Tipos compartilhados
supabase/setup.sql   Script de criação do banco
\`\`\`

## Observação de segurança
A autenticação é um protótipo: a senha é comparada em texto puro na tabela `users`.
Para produção, migre para o **Supabase Auth** nativo (hash de senha, sessões e RLS por usuário).
