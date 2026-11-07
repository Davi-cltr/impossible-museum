# The Impossible Museum

> *An archive of things that should not exist.*
> Um arquivo de coisas que não deveriam existir.

Um museu contemporâneo para visitar no navegador, em 3D. Concreto, vidro, luz natural pela claraboia — e, em cada galeria, uma obra que parece normal até você reparar melhor. Nada aqui é caótico ou surreal: a regra é **fazer o impossível parecer plausível**.

**Visite:** https://davi-cltr.github.io/impossible-museum/

---

## A visita

- **Entrada** — a praça, a fachada, ENTRAR. As portas de vidro se abrem e você caminha até o átrio.
- **Átrio** — recepção, a claraboia projetando a grelha de aço nas paredes de concreto, e um bilhete do Curador no balcão.
- **Cinco exposições**
  - **01 · As Leis do Espaço** — *A Escada Infinita* e *A Sombra*.
  - **02 · A Memória dos Objetos** — *A Sala*, a sala de leitura e o lugar vazio da obra 014.
  - **03 · O Tempo, Interrompido** — *O Relógio* e *A Janela*.
  - **04 · Percepção** — *O Espelho* e *A Pintura*.
  - **05 · Não Classificado** — objetos cobertos, um memorando e o silêncio.
- **O Arquivo** — o catálogo do museu. Obras desconhecidas ficam fechadas até serem encontradas; o que você observa vai sendo anotado.
- **A Planta** — desenho arquitetônico que se revela conforme você visita as salas, com "você está aqui" em tempo real.
- **O museu lembra de você** — as descobertas ficam guardadas no navegador; quem volta é reconhecido.

<details>
<summary>Spoilers: as anomalias e os segredos</summary>

| Obra | O que acontece |
|---|---|
| 001 · A Escada Infinita | Ela continua. Cada patamar é o patamar de baixo; só o número pintado na parede muda. |
| 002 · O Espelho | Depois de um tempo diante dele, o reflexo responde atrasado. E mostra uma placa que só existe no espelho. |
| 003 · O Relógio | Se você continua olhando, o ponteiro dos segundos às vezes volta um segundo. |
| 004 · A Sala | Cada vez que você sai e volta, uma coisa não está onde estava. |
| 005 · A Pintura | Os olhos acompanham você — até que passam a olhar para outra coisa na galeria. |
| 006 · A Sombra | O pedestal está vazio. A parede ainda recebe a sombra do vaso. |
| 007 · A Janela | Por ela é sempre fim de tarde. |
| 008 · O Eco | Na Galeria 05, quando você para, seus passos ainda dão mais dois. |
| 014 · O Visitante | Retirada da exposição. Requer um visitante. |

Segredos: um livro que abre uma porta em outro lugar; observar a pintura por tempo suficiente; uma segunda descrição que só se lê no espelho; uma sala que só existe depois de certas obras serem vistas — e que não cabe na planta.

</details>

## Como andar

**No computador**
- Arraste para olhar · clique no chão para andar · `W A S D` ou setas para mover · `Shift` para andar mais rápido · roda do mouse para avançar
- Clique numa obra para se aproximar dela; clique em portas, livros e documentos para interagir
- `M` planta · `I` arquivo · `Esc` fecha

**No celular** — não é a versão do computador encolhida: é um passeio guiado por pontos (setas ← →), arrastar para olhar, tocar para interagir, botões para subir e descer a escada, e a placa da obra como uma folha que se abre por baixo.

## Feito com

- **Vite + React + TypeScript** para a interface
- **three.js** usado direto (sem R3F): arquitetura gerada a partir da planta, colisões próprias, caminhos com A\* na grade e uma espiral para a escada
- **GSAP** nas transições e microinterações
- **Web Audio** — todo o som é sintetizado: tom de sala, reverberação do tamanho de cada espaço, passos que mudam com o piso, portas, o tique do relógio, a fita
- Nenhuma imagem ou modelo externo: texturas (concreto polido, concreto de fôrma, gesso, carvalho, travertino, granilite), o retrato, o céu e o jardim da janela são desenhados em código
- Tipografia: Instrument Serif, Geist e Geist Mono

**Desempenho:** três níveis de qualidade (alta com GTAO e sombras de 4096 px; média; baixa para celular), escolha automática pelo aparelho, rebaixamento automático se o quadro ficar lento, luzes pontuais em um conjunto fixo que acompanha o visitante, reflexo do espelho só quando ele está à vista, 3D pausado sob os painéis e na aba escondida, painéis carregados só quando abertos, e uma página do arquivo para navegadores sem WebGL. Respeita "reduzir movimento".

## Rodar localmente

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # gera a pasta dist/
npm run preview  # serve o build
```

O deploy no GitHub Pages é automático a cada push na `main` (`.github/workflows/deploy.yml`).

## Estrutura

```
src/
  content/   acervo (obras, galerias, documentos) e textos em inglês e português
  core/      estado (memória e sessão) e som
  engine/    o motor 3D: planta, materiais, mundo, luzes, portas, navegação, visitante
    pecas/   as obras e os objetos de cada galeria
  ui/        entrada, cabeçalho, placa, arquivo, planta, documentos, ajustes
  styles/    CSS
```

---

Davi Motta · 2026
