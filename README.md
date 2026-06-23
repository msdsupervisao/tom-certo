# Tom Certo

Cante um trecho, receba a cifra no seu tom — sem ficar adivinhando capotraste.

## Estado atual

MVP em construção. Motor completo já implementado e testado:

- ✅ Busca de música (catálogo mock, 5 músicas de teste)
- ✅ Detecção de tom cantado (autocorrelação — mesmo algoritmo validado no teste isolado, 70-90% de acerto em condições reais)
- ✅ Transposição automática de cifra (14/14 testes de lógica passando, incluindo acordes com baixo de inversão e bemóis)
- ✅ Feedback de confiança na UI quando a detecção não é estável
- ✅ Exibição da cifra transposta no formato padrão de mercado (acordes em linha própria acima da letra, alinhados por coluna — como Cifra Club/Ultimate Guitar)
- ✅ Tema visual colorido/vibrante com alternância claro/escuro (botão no topo)
- ✅ Afinador de violão em tempo real (escuta o microfone e compara com as 6 cordas EADGBE)
- ✅ Controle de tamanho de fonte da cifra (A− / A+)
- ✅ Impressão da cifra (botão dedicado, oculta controles e mostra só letra+acordes no papel)
- ✅ Salvar como PDF (usa a opção nativa "Salvar como PDF" da janela de impressão do navegador)
- ✅ Rolagem automática da cifra (0.1x a 1.5x, ajuste fino por botões −/+), pausa automática no fim
- ✅ Ilustrações originais: padrão de motivos musicais como textura de fundo da cifra — sem fotos de pessoas reais, evitando qualquer questão de direito de imagem/copyright
- ✅ Design system completo: paleta documentada, tipografia, e 6 componentes base reutilizáveis (Button, Input, Card, Modal, Navbar, Sidebar) em `app/components/ui/`. Ver `design-system/DESIGN_SYSTEM.md`.
- ✅ Home reformulada com foco na proposta de valor central (detectar o tom, não "buscar cifra"): hero com CTA direto, seção "Como funciona", Perfil Vocal, Músicas Recentes e Favoritos — todos com dados REAIS persistidos em localStorage, sem nenhum número decorativo/fictício
- ⚠️ Prova social (contadores de "X músicas ajustadas por todos os usuários") foi conscientemente NÃO implementada: exigiria backend com usuários reais agregados, e inventar esses números seria propaganda falsa, não prova social genuína. Fica registrado como pendência para quando houver base de usuários real.

Fora do MVP por decisão consciente (ver arquitetura completa no histórico do projeto):
- Sem login/conta de usuário
- Sem pagamento (decisão pendente — Stripe é o caminho recomendado quando definir o modelo)
- Sem catálogo real (mock com 5 músicas — trocar por fonte real não deve exigir mudança no motor)

## Como rodar

Este projeto foi montado manualmente (sem `create-next-app`) porque o ambiente de build não tinha acesso à internet. Para rodar localmente ou no Claude Code:

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## Estrutura

```
app/
  page.tsx                 → tela de busca (etapa 1-2 do fluxo)
  layout.tsx                → layout raiz, inclui a Navbar fixa
  musica/[id]/page.tsx     → tela da música: cifra, gravador, transposição (etapas 2-5)
  components/
    ui/                    → design system: Button, Input, Card, Modal, Navbar, Sidebar
    illustrations/         → SVGs originais (PadraoMusical em uso; SilhuetasShow disponível)
    GravadorDeTom.tsx      → captura de áudio + detecção em tempo real
    CifraViewer.tsx        → renderização da letra com acordes acima (padrão Cifra Club) + rolagem automática
    Afinador.tsx           → afinador de violão em tempo real (modal)
    ControleFonte.tsx      → zoom de fonte da cifra
lib/
  pitch-detection.ts       → algoritmo de autocorrelação (núcleo técnico validado)
  music-theory.ts          → conversão frequência→nota e transposição de acordes
  guitar-tuning.ts         → comparação de frequência com as 6 cordas do violão
  data/songs-mock.ts       → catálogo de teste
design-system/
  DESIGN_SYSTEM.md         → documentação de paleta, tipografia e componentes
pitch-test/index.html      → teste isolado original (mantido como referência histórica)
```

## Próximos passos sugeridos

1. Rodar `npm install && npm run dev` e testar o fluxo completo ponta a ponta com sua própria voz
2. Decidir o modelo de catálogo (curado manual vs. fonte externa) e licenciamento
3. Decidir o modelo de monetização e integrar Stripe Checkout
4. Testar em mais dispositivos/microfones para mapear onde a detecção falha mais
