# Design System — Tom Certo

Documentação de referência. O código-fonte de verdade das variáveis vive em
`app/globals.css`; este arquivo existe para consulta rápida e justificativa
das escolhas.

## Paleta de cores

| Token | Hex (escuro) | Hex (claro) | Uso |
|---|---|---|---|
| `--color-primary` | `#FF5D8F` | `#E0356F` | Ação principal, CTAs, marca |
| `--color-secondary` | `#6C5CE7` | `#5B3FD6` | Acordes, elementos musicais, links |
| `--color-success` | `#2DD4BF` | `#0D9488` | Confiança alta, confirmação |
| `--color-warning` | `#FFD23F` | `#D99B00` | Confiança média, atenção |
| `--color-error` | `#FF4D6A` | `#DC2645` | Erro, confiança baixa |
| `--bg` | `#0D0A1F` | `#FEF6E4` | Fundo da página |
| `--panel` | `#1C1638` | `#FFFFFF` | Cards, inputs, superfícies elevadas |
| `--text` | `#F4F1FB` | `#2B1A3D` | Texto principal |
| `--text-dim` | `#A39BC9` | `#6B5D8A` | Texto secundário, legendas |
| `--border` | `#2E2654` | `#ECDCC0` | Bordas, divisores |

**Por que essa paleta, e não o roxo-neon genérico de SaaS:** o domínio do
produto é música e performance — rosa-show e violeta-cifra vêm de lá, não de
uma paleta corporativa abstrata. As três cores de estado (sucesso/atenção/erro)
não são o verde/amarelo/vermelho semáforo padrão: turquesa, amarelo e
vermelho-rosado foram escolhidos para conviver bem com o rosa e o violeta de
marca sem brigar visualmente.

## Tipografia

- **Display** — `Space Grotesk` (peso 500/600/700): títulos, hero, nomes de
  música. Geométrica, com personalidade, evita o clichê de Inter/Poppins.
- **Mono** — `JetBrains Mono` (peso 400/500/600): cifra e acordes. Não é
  opcional nem decorativo — o alinhamento de coluna entre acorde e sílaba
  *depende* de fonte monoespaçada para funcionar.

| Token | Tamanho | Uso |
|---|---|---|
| `--text-xs` | 12px | Legendas, metadados |
| `--text-sm` | 14px | Corpo secundário, labels |
| `--text-base` | 16px | Corpo padrão |
| `--text-lg` | 18px | Subtítulos |
| `--text-xl` | 24px | Título de seção |
| `--text-2xl` | 32px | Título de página |
| `--text-3xl` | 44px | Hero |

## Componentes base

Todos em `app/components/ui/`:

- **Button** (`Button.tsx`) — 5 variantes (primary, secondary, outline, ghost,
  danger), 3 tamanhos, estado de loading com spinner, ícone opcional.
- **Input** (`Input.tsx`) — estados neutro/erro/sucesso, rótulo, dica,
  ícone à esquerda, atributos ARIA corretos para leitor de tela.
- **Card** (`Card.tsx`) — modo estático e modo interativo (hover de elevação),
  3 densidades de padding.
- **Modal** (`Modal.tsx`) — fecha com Esc, clique fora ou botão X. Usado pelo
  Afinador de violão.
- **Navbar** (`Navbar.tsx`) — fixa no topo, logo sempre leva à home, slot de
  ações à direita (tema, busca, etc).
- **Sidebar** (`Sidebar.tsx`) — sticky em telas grandes, empilha acima do
  conteúdo principal em mobile. Usada na tela da música para os controles de
  gravação ficarem visíveis enquanto a cifra rola.

## Microinterações

- **Hover**: cards interativos sobem 2px e ganham sombra (`Card interativo`);
  botões escurecem levemente a cor de fundo.
- **Loading**: `Button carregando` substitui o conteúdo por um spinner SVG
  animado, mantendo a largura do botão estável (sem "pulo" de layout).
- **Feedback de ação**: estabilidade da detecção de tom muda de cor
  (turquesa/amarelo) em tempo real; afinador mostra ponteiro se movendo
  conforme a corda se aproxima da nota certa.
- **Estados vazios**: busca sem resultado mostra mensagem direta ("Nenhuma
  música encontrada para X") em vez de tela em branco; home sem busca ativa
  mostra "Em destaque" com o catálogo, nunca fica vazia esperando digitação.

## Nota sobre uma tentativa anterior

Uma versão anterior do hero da home usava uma ilustração de silhuetas de
banda (`SilhuetasShow.tsx`, ainda no repositório mas sem uso ativo). O recorte
do SVG dentro do container ficou mal controlado e a opacidade não se aplicou
como esperado, resultando em formas sólidas sobrepondo o texto. Em vez de
adicionar mais CSS para tentar salvar aquele elemento, foi removido do fluxo
ativo e substituído pela textura `PadraoMusical`, mais simples e previsível.
Fica registrado aqui para quem quiser retomar a ideia das silhuetas com mais
tempo de ajuste fino.
