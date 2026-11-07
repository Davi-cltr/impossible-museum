// O acervo: galerias, obras (com o que se sabe e o que só aparece depois) e os documentos do Curador.
// Todo texto existe em inglês e português.

export type L = { en: string; pt: string }
export type Lang = keyof L

export type GaleriaId = 'atrio' | 'g01' | 'g02' | 'g03' | 'g04' | 'g05' | 'escada' | 'servico' | 'sala004' | 's014'

export interface Galeria {
  id: GaleriaId
  numero: string
  nome: L
  sub: L
}

export const GALERIAS: Record<GaleriaId, Galeria> = {
  atrio: { id: 'atrio', numero: '', nome: { en: 'Atrium', pt: 'Átrio' }, sub: { en: 'Reception and information', pt: 'Recepção e informações' } },
  g01: { id: 'g01', numero: '01', nome: { en: 'The Laws of Space', pt: 'As Leis do Espaço' }, sub: { en: 'Works concerning space and architecture', pt: 'Obras sobre espaço e arquitetura' } },
  g02: { id: 'g02', numero: '02', nome: { en: 'The Memory of Objects', pt: 'A Memória dos Objetos' }, sub: { en: 'Objects that appear to remember', pt: 'Objetos que parecem lembrar' } },
  g03: { id: 'g03', numero: '03', nome: { en: 'Time, Interrupted', pt: 'O Tempo, Interrompido' }, sub: { en: 'Phenomena concerning time', pt: 'Fenômenos relacionados ao tempo' } },
  g04: { id: 'g04', numero: '04', nome: { en: 'Perception', pt: 'Percepção' }, sub: { en: 'Works that alter the visitor', pt: 'Obras que alteram quem as observa' } },
  g05: { id: 'g05', numero: '05', nome: { en: 'Unclassified', pt: 'Não Classificado' }, sub: { en: 'Works that cannot be explained', pt: 'Obras que não podem ser explicadas' } },
  escada: { id: 'escada', numero: '01', nome: { en: 'Stair Hall', pt: 'Hall da Escada' }, sub: { en: 'Exhibit 001', pt: 'Obra 001' } },
  servico: { id: 'servico', numero: '', nome: { en: 'Service Corridor', pt: 'Corredor de Serviço' }, sub: { en: 'Staff only', pt: 'Somente funcionários' } },
  sala004: { id: 'sala004', numero: '02', nome: { en: 'The Room', pt: 'A Sala' }, sub: { en: 'Exhibit 004', pt: 'Obra 004' } },
  s014: { id: 's014', numero: '014', nome: { en: 'Room 014', pt: 'Sala 014' }, sub: { en: 'Not on the plan', pt: 'Fora da planta' } },
}

export interface Obra {
  id: string
  galeria: GaleriaId
  titulo: L
  classificacao: L
  status: L
  descoberta: L
  descricao: L
  ficha: { k: L; v: L }[]
  /** o que o visitante percebeu (aparece no arquivo depois que a anomalia é observada) */
  anomalia: L
  /** segunda descrição, escondida */
  curador?: L
  /** começa desconhecida no arquivo */
  oculta?: boolean
  /** como aparece enquanto desconhecida */
  rotuloOculto?: L
}

const t = (en: string, pt: string): L => ({ en, pt })

export const OBRAS: Obra[] = [
  {
    id: '001',
    galeria: 'g01',
    titulo: t('The Infinite Staircase', 'A Escada Infinita'),
    classificacao: t('Spatial anomaly', 'Anomalia espacial'),
    status: t('Stable', 'Estável'),
    descoberta: t('Found 14 March 1962, Turin', 'Encontrada em 14 de março de 1962, Turim'),
    descricao: t(
      'A service stair relocated from a demolished printing works. Two flights, one landing, a handrail in oiled steel. Visitors are welcome to use it.',
      'Uma escada de serviço transferida de uma gráfica demolida. Dois lances, um patamar, corrimão de aço oleado. Os visitantes podem usá-la.',
    ),
    ficha: [
      { k: t('Material', 'Material'), v: t('Cast concrete, steel, terrazzo', 'Concreto moldado, aço, granilite') },
      { k: t('Floor to floor', 'Piso a piso'), v: t('4.20 m', '4,20 m') },
      { k: t('Steps', 'Degraus'), v: t('24', '24') },
      { k: t('Floors', 'Andares'), v: t('Not recorded', 'Não registrado') },
    ],
    anomalia: t(
      'The stair continues. Every landing is the landing below it. Only the number painted on the wall changes.',
      'A escada continua. Cada patamar é o patamar de baixo. Só muda o número pintado na parede.',
    ),
    curador: t('Count the floors on the way up. Then count them on the way down.', 'Conte os andares na subida. Depois conte na descida.'),
  },
  {
    id: '002',
    galeria: 'g04',
    titulo: t('The Mirror', 'O Espelho'),
    classificacao: t('Perceptual anomaly', 'Anomalia perceptiva'),
    status: t('Stable', 'Estável'),
    descoberta: t('Acquired 1979, private estate, Lisbon', 'Adquirido em 1979, espólio particular, Lisboa'),
    descricao: t(
      'A silvered glass in a blackened steel frame. It reflects the gallery accurately. Please stand in front of it for a while.',
      'Um vidro espelhado em moldura de aço enegrecido. Reflete a galeria com precisão. Fique diante dele por algum tempo.',
    ),
    ficha: [
      { k: t('Material', 'Material'), v: t('Silver on glass, steel', 'Prata sobre vidro, aço') },
      { k: t('Dimensions', 'Dimensões'), v: t('320 × 210 cm', '320 × 210 cm') },
      { k: t('Delay', 'Atraso'), v: t('Variable', 'Variável') },
    ],
    anomalia: t(
      'After some time, the reflection begins to answer late. Never by much. Enough to notice.',
      'Depois de algum tempo, o reflexo passa a responder atrasado. Nunca muito. O suficiente para perceber.',
    ),
    curador: t('Read the label next to the mirror. Then read it in the mirror.', 'Leia a placa ao lado do espelho. Depois leia no espelho.'),
  },
  {
    id: '003',
    galeria: 'g03',
    titulo: t('The Clock', 'O Relógio'),
    classificacao: t('Temporal anomaly', 'Anomalia temporal'),
    status: t('Under observation', 'Em observação'),
    descoberta: t('Removed from a railway station, 1931', 'Retirado de uma estação ferroviária, 1931'),
    descricao: t(
      'A station clock synchronised to local time. Its mechanism has been replaced three times. It keeps perfect time.',
      'Um relógio de estação sincronizado com a hora local. O mecanismo já foi trocado três vezes. Ele marca a hora perfeitamente.',
    ),
    ficha: [
      { k: t('Material', 'Material'), v: t('Enamel, aluminium, glass', 'Esmalte, alumínio, vidro') },
      { k: t('Diameter', 'Diâmetro'), v: t('160 cm', '160 cm') },
      { k: t('Accuracy', 'Precisão'), v: t('± 1 second', '± 1 segundo') },
    ],
    anomalia: t(
      'If you keep watching, the second hand occasionally steps back one second. Nothing else happens.',
      'Se você continua olhando, o ponteiro dos segundos às vezes volta um segundo. Nada mais acontece.',
    ),
    curador: t('The clock does not go back. We go forward one second too many.', 'O relógio não volta. Nós é que avançamos um segundo a mais.'),
  },
  {
    id: '004',
    galeria: 'g02',
    titulo: t('The Room', 'A Sala'),
    classificacao: t('Mnemonic anomaly', 'Anomalia mnemônica'),
    status: t('Active', 'Ativa'),
    descoberta: t('Reconstructed 1988 from an apartment in Prague', 'Reconstruída em 1988 a partir de um apartamento em Praga'),
    descricao: t(
      'A furnished room: a table, a chair, a window, a door. Every object is original. Visitors may enter.',
      'Um cômodo mobiliado: mesa, cadeira, janela, porta. Todos os objetos são originais. Os visitantes podem entrar.',
    ),
    ficha: [
      { k: t('Dimensions', 'Dimensões'), v: t('4.8 × 4.8 × 3.2 m', '4,8 × 4,8 × 3,2 m') },
      { k: t('Objects', 'Objetos'), v: t('4', '4') },
      { k: t('Arrangement', 'Disposição'), v: t('See notes', 'Ver observações') },
    ],
    anomalia: t(
      'Each time you leave and come back, one thing is not where it was. The room remembers that you were there.',
      'Cada vez que você sai e volta, uma coisa não está onde estava. A sala lembra que você esteve ali.',
    ),
    curador: t('It is not rearranging itself. It is getting used to you.', 'Ela não está se rearrumando. Está se acostumando com você.'),
  },
  {
    id: '005',
    galeria: 'g04',
    titulo: t('The Painting', 'A Pintura'),
    classificacao: t('Perceptual anomaly', 'Anomalia perceptiva'),
    status: t('Stable', 'Estável'),
    descoberta: t('Unsigned. Arrived 1974, the year the museum opened', 'Sem assinatura. Chegou em 1974, ano de abertura do museu'),
    descricao: t(
      'Portrait of a seated figure, oil on linen. As with many portraits, the eyes appear to follow the viewer across the room.',
      'Retrato de uma figura sentada, óleo sobre linho. Como em muitos retratos, os olhos parecem seguir quem atravessa a sala.',
    ),
    ficha: [
      { k: t('Medium', 'Técnica'), v: t('Oil on linen', 'Óleo sobre linho') },
      { k: t('Dimensions', 'Dimensões'), v: t('142 × 110 cm', '142 × 110 cm') },
      { k: t('Sitter', 'Retratado'), v: t('Unidentified', 'Não identificado') },
    ],
    anomalia: t(
      'At some point the figure stops looking at you. It is looking at something else in the gallery.',
      'Em algum momento a figura para de olhar para você. Está olhando para outra coisa na galeria.',
    ),
    curador: t('The sitter was identified in 1975. The name was removed from the label at the Curator’s request.', 'O retratado foi identificado em 1975. O nome foi retirado da placa a pedido do Curador.'),
  },
  {
    id: '006',
    galeria: 'g01',
    titulo: t('The Shadow', 'A Sombra'),
    classificacao: t('Spatial anomaly', 'Anomalia espacial'),
    status: t('Stable', 'Estável'),
    descoberta: t('Noticed during an installation, 2003', 'Percebida durante uma montagem, 2003'),
    descricao: t(
      'An empty plinth under a single spotlight. The vase it displayed was sold in 2003.',
      'Um pedestal vazio sob um único refletor. O vaso que ele exibia foi vendido em 2003.',
    ),
    ficha: [
      { k: t('Material', 'Material'), v: t('Painted plywood, light', 'Compensado pintado, luz') },
      { k: t('Height', 'Altura'), v: t('110 cm', '110 cm') },
      { k: t('Object', 'Objeto'), v: t('None', 'Nenhum') },
    ],
    anomalia: t('The plinth is empty. The wall behind it still receives the shadow of the vase.', 'O pedestal está vazio. A parede atrás dele ainda recebe a sombra do vaso.'),
    oculta: true,
    rotuloOculto: t('Unknown', 'Desconhecida'),
  },
  {
    id: '007',
    galeria: 'g03',
    titulo: t('The Window', 'A Janela'),
    classificacao: t('Temporal anomaly', 'Anomalia temporal'),
    status: t('Stable', 'Estável'),
    descoberta: t('Part of the original building, 1974', 'Parte do prédio original, 1974'),
    descricao: t('A window onto the south garden. Part of the original building.', 'Uma janela para o jardim sul. Parte do prédio original.'),
    ficha: [
      { k: t('Material', 'Material'), v: t('Glass, bronze frame', 'Vidro, caixilho de bronze') },
      { k: t('Orientation', 'Orientação'), v: t('South', 'Sul') },
      { k: t('Time shown', 'Hora mostrada'), v: t('19:42', '19:42') },
    ],
    anomalia: t('Through this window it is always the end of the afternoon. Through the others, it is not.', 'Por esta janela é sempre fim de tarde. Pelas outras, não.'),
    oculta: true,
    rotuloOculto: t('Unknown', 'Desconhecida'),
  },
  {
    id: '008',
    galeria: 'g05',
    titulo: t('The Echo', 'O Eco'),
    classificacao: t('Unclassified', 'Não classificada'),
    status: t('Unconfirmed', 'Não confirmada'),
    descoberta: t('Reported by a guard, 2019', 'Relatada por um vigia, 2019'),
    descricao: t('Gallery 05 is kept silent. Visitors are asked to walk slowly.', 'A Galeria 05 é mantida em silêncio. Pede-se aos visitantes que andem devagar.'),
    ficha: [
      { k: t('Medium', 'Meio'), v: t('Sound', 'Som') },
      { k: t('Duration', 'Duração'), v: t('Two steps', 'Dois passos') },
    ],
    anomalia: t('When you stop walking in this gallery, your footsteps take two more steps.', 'Quando você para de andar nesta galeria, seus passos ainda dão mais dois.'),
    oculta: true,
    rotuloOculto: t('Unknown', 'Desconhecida'),
  },
  {
    id: '014',
    galeria: 's014',
    titulo: t('The Visitor', 'O Visitante'),
    classificacao: t('Not yet determined', 'Ainda não determinada'),
    status: t('Ongoing', 'Em andamento'),
    descoberta: t('Today', 'Hoje'),
    descricao: t(
      'Catalogued during this visit. The exhibit entered the museum on its own, walked through every gallery and found this room.',
      'Catalogada durante esta visita. A obra entrou no museu por conta própria, percorreu todas as galerias e encontrou esta sala.',
    ),
    ficha: [
      { k: t('Medium', 'Técnica'), v: t('Attention', 'Atenção') },
      { k: t('Location', 'Localização'), v: t('See the model', 'Ver a maquete') },
      { k: t('Accession', 'Registro'), v: t('Automatic', 'Automático') },
    ],
    anomalia: t('The model of the museum in Room 014 shows a small light. It moves when you move.', 'A maquete do museu na Sala 014 mostra uma pequena luz. Ela se move quando você se move.'),
    oculta: true,
    rotuloOculto: t('Removed', 'Removida'),
  },
]

export const OBRA = Object.fromEntries(OBRAS.map((o) => [o.id, o])) as Record<string, Obra>

export interface Documento {
  id: string
  tipo: 'carta' | 'registro' | 'gravacao' | 'memorando'
  titulo: L
  local: L
  corpo: L
}

export const DOCUMENTOS: Documento[] = [
  {
    id: 'boas-vindas',
    tipo: 'carta',
    titulo: t('A note from the Curator', 'Um bilhete do Curador'),
    local: t('Reception desk', 'Balcão da recepção'),
    corpo: t(
      'Welcome.\n\nThis museum does not acquire works. They arrive, and we keep them. Every object in these galleries has been examined, measured and photographed. Nothing here is a trick.\n\nYou may touch the doors. You may climb the stair. Please do not run in Gallery 05.\n\n— C.',
      'Bem-vindo.\n\nEste museu não adquire obras. Elas chegam, e nós as guardamos. Cada objeto destas galerias foi examinado, medido e fotografado. Nada aqui é um truque.\n\nVocê pode tocar nas portas. Pode subir a escada. Por favor, não corra na Galeria 05.\n\n— C.',
    ),
  },
  {
    id: 'livro-tombo',
    tipo: 'registro',
    titulo: t('Accession register, vol. II (extract)', 'Livro de tombo, vol. II (trecho)'),
    local: t('Gallery 02, reading desk', 'Galeria 02, mesa de leitura'),
    corpo: t(
      '001 — Staircase. Stable.\n002 — Mirror. Stable.\n003 — Clock. Under observation.\n004 — Room. Active.\n005 — Painting. Stable.\n006 — 008: see separate files.\n009 — deaccessioned.\n010 — deaccessioned.\n011 — deaccessioned.\n012 — deaccessioned.\n013 — deaccessioned.\n014 — removed from public view. Requires a visitor.',
      '001 — Escada. Estável.\n002 — Espelho. Estável.\n003 — Relógio. Em observação.\n004 — Sala. Ativa.\n005 — Pintura. Estável.\n006 — 008: ver fichas separadas.\n009 — baixa do acervo.\n010 — baixa do acervo.\n011 — baixa do acervo.\n012 — baixa do acervo.\n013 — baixa do acervo.\n014 — retirada da exposição. Requer um visitante.',
    ),
  },
  {
    id: 'manutencao',
    tipo: 'registro',
    titulo: t('Maintenance report — Exhibit 003', 'Relatório de manutenção — Obra 003'),
    local: t('Gallery 03', 'Galeria 03'),
    corpo: t(
      'Third replacement of the movement. The new mechanism was tested for 72 hours in the workshop without fault.\n\nReinstalled at 09:00. At 09:14 the second hand stepped back once.\n\nThe technician asked to be moved to another building. Request granted.',
      'Terceira troca do mecanismo. O novo mecanismo foi testado por 72 horas na oficina, sem falhas.\n\nReinstalado às 09:00. Às 09:14 o ponteiro dos segundos voltou uma vez.\n\nO técnico pediu transferência para outro prédio. Pedido aceito.',
    ),
  },
  {
    id: 'gravacao-escada',
    tipo: 'gravacao',
    titulo: t('Recording, cassette 7, side A (transcript)', 'Gravação, fita 7, lado A (transcrição)'),
    local: t('Stair Hall, landing', 'Hall da Escada, patamar'),
    corpo: t(
      '[hiss] ...level nine. Same handrail. Same mark on the third step. I have stopped counting the steps and started counting the numbers on the walls. [pause] They are correct. That is the part I don’t like. [click]',
      '[chiado] ...andar nove. Mesmo corrimão. Mesma marca no terceiro degrau. Parei de contar os degraus e comecei a contar os números nas paredes. [pausa] Eles estão certos. É disso que eu não gosto. [clique]',
    ),
  },
  {
    id: 'memorando-014',
    tipo: 'memorando',
    titulo: t('Internal memo — re: 014', 'Memorando interno — ref.: 014'),
    local: t('Gallery 05', 'Galeria 05'),
    corpo: t(
      'To all staff.\n\nExhibit 014 is no longer on public display. Its room remains closed. If a visitor asks, the room does not exist; this is, strictly speaking, true.\n\nThe door may be opened from the reading room. Please don’t.\n\n— C.',
      'A todos os funcionários.\n\nA Obra 014 não está mais em exposição. A sala dela continua fechada. Se um visitante perguntar, a sala não existe; o que, a rigor, é verdade.\n\nA porta pode ser aberta a partir da sala de leitura. Por favor, não abram.\n\n— C.',
    ),
  },
  {
    id: 'carta-final',
    tipo: 'carta',
    titulo: t('A letter, left on the desk', 'Uma carta, deixada na mesa'),
    local: t('Room 014', 'Sala 014'),
    corpo: t(
      'You found it.\n\nI keep a model of the museum in this room so that I can see who is inside. Tonight there is only one light in it, and it is standing where you are standing.\n\nThe others asked what the museum was for. I told them the truth: it collects what should not exist. They did not ask what that included.\n\nYou are welcome to stay. Most do not.\n\n— C.',
      'Você encontrou.\n\nGuardo uma maquete do museu nesta sala para ver quem está lá dentro. Esta noite há só uma luz nela, e está parada onde você está parado.\n\nOs outros perguntavam para que servia o museu. Eu disse a verdade: ele guarda o que não deveria existir. Ninguém perguntou o que isso incluía.\n\nVocê pode ficar. A maioria não fica.\n\n— C.',
    ),
  },
]

export const DOC = Object.fromEntries(DOCUMENTOS.map((d) => [d.id, d])) as Record<string, Documento>
