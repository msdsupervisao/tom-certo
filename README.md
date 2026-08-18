# Tom Certo

Cante um trecho, receba a cifra no seu tom — sem ficar adivinhando capotraste.

**No ar:** https://tom-certo.vercel.app

## O que é

App web que resolve um problema real de quem canta e toca: você canta um trecho,
o app **detecta o seu tom vocal** pelo microfone e devolve a **cifra já transposta**
para o tom certo — em vez de você ficar testando capotraste no chute. A proposta
central é *detectar o tom*, não apenas *buscar cifra*.

## Estado atual

App publicado e funcional. Principais recursos implementados e testados:

- ✅ **Busca de música** com catálogo curado (104 músicas com slug do Cifra Club) +
  fallback no iTunes, que confirma se a cifra existe no Cifra Club antes de exibir
- ✅ **Cifra real do Cifra Club**: as rotas de API buscam e fazem parse da cifra ao
  vivo (nada é armazenado — cada request é um fetch novo)
- ✅ **Detecção de tom cantado** por autocorrelação (~70–90% de acerto em condições reais)
- ✅ **Transposição automática de cifra** (14/14 testes de lógica, incluindo acordes
  com baixo de inversão e bemóis)
- ✅ Feedback de confiança na UI quando a detecção não está estável
- ✅ Cifra no formato padrão de mercado (acordes em linha própria acima da letra,
  alinhados por coluna — como Cifra Club/Ultimate Guitar)
- ✅ **Login e conta de usuário** via Supabase (auth + callback)
- ✅ **Favoritos na nuvem** (Supabase) e **histórico** local
- ✅ Afinador de violão em tempo real (compara o microfone com as 6 cordas EADGBE)
- ✅ Controle de tamanho de fonte da cifra (A− / A+)
- ✅ Impressão da cifra e "Salvar como PDF" (via janela de impressão do navegador)
- ✅ Rolagem automática da cifra (0.1x a 1.5x, ajuste fino, pausa automática no fim)
- ✅ Diagramas de acorde (ChordDiagram)
- ✅ Tema claro/escuro com alternância no topo
- ✅ Ilustrações originais (padrão de motivos musicais como textura) — sem fotos de
  pessoas reais, evitando qualquer questão de direito de imagem/copyright
- ✅ Design system: paleta documentada, tipografia e componentes base reutilizáveis
  em `app/components/ui/`. Ver `design-system/DESIGN_SYSTEM.md`
- ✅ PWA com a identidade do app

Pendências conscientes (registradas de propósito):
- ⚠️ **Prova social** (contadores de "X músicas ajustadas por todos os usuários") NÃO
  implementada: exigiria backend agregando usuários reais, e inventar esses números
  seria propaganda falsa. Fica para quando houver base de usuários real.
- ⚠️ **Monetização**: sem pagamento ainda (Stripe Checkout é o caminho recomendado
  quando o modelo for definido).
- ⚠️ **Dependência de scraping do Cifra Club**: funciona bem, mas pode quebrar se o
  HTML deles mudar, e há a questão de termos de uso/licenciamento a resolver antes de
  escalar.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000

### Variáveis de ambiente

O app usa Supabase para login e favoritos. Crie um arquivo `.env.local` na raiz
(não versionado) com:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

> No deploy (Vercel), essas mesmas variáveis precisam estar cadastradas em
> **Project → Settings → Environment Variables** — o `.env.local` não vai para o Git.

## Deploy

Hospedado na **Vercel**, com deploy automático a cada push na branch `main` do
repositório GitHub. A URL de produção é https://tom-certo.vercel.app.

## Estrutura

```
app/
  page.tsx                    → home (proposta de valor + busca + recentes/favoritos)
  layout.tsx                  → layout raiz
  buscar/page.tsx             → tela de busca
  musica/[[...slug]]/         → tela da música: cifra, gravador, transposição
  afinador/page.tsx           → afinador de violão
  login/, auth/callback/      → autenticação Supabase
  favoritas/, perfil/, sobre/ → páginas de conta e institucional
  api/
    buscar/route.ts           → busca (catálogo curado + iTunes, confirma no Cifra Club)
    cifra/route.ts            → fetch + parse da cifra real do Cifra Club
    spotify/route.ts          → apoio de metadados
    diagnostico/route.ts      → rota de diagnóstico
  components/
    ui/                       → design system (Button, Input, Card, Modal, Navbar, Sidebar)
    illustrations/            → SVGs originais
    GravadorDeTom.tsx         → captura de áudio + detecção em tempo real
    CifraViewer.tsx           → letra com acordes acima + rolagem automática
    Afinador.tsx              → afinador em tempo real
    ChordDiagram.tsx          → diagrama de acordes
    ControleFonte.tsx         → zoom de fonte da cifra
    AuthProvider, BottomNav, BuscaMusica, PainelFavoritos, ThemeToggle, ...
lib/
  pitch-detection.ts          → autocorrelação (núcleo técnico validado)
  music-theory.ts             → frequência→nota e transposição de acordes
  guitar-tuning.ts            → comparação com as 6 cordas do violão
  supabase.ts                 → cliente Supabase
  favoritos-nuvem.ts          → favoritos persistidos no Supabase
  historico-local.ts          → histórico em localStorage
  data/catalogo-musicas.ts    → catálogo curado (104 músicas, slug do Cifra Club)
design-system/
  DESIGN_SYSTEM.md            → paleta, tipografia e componentes
pitch-test/index.html         → teste isolado original (referência histórica)
```

## Próximos passos sugeridos

1. Testar o fluxo completo ponta a ponta com a própria voz em vários microfones
2. Ampliar o catálogo curado e/ou melhorar o fallback de busca
3. Avaliar licenciamento/robustez da fonte de cifras (hoje Cifra Club via scraping)
4. Definir o modelo de monetização e integrar Stripe Checkout
5. Mapear onde a detecção de tom falha mais e refinar o algoritmo
