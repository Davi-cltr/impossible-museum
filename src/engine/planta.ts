// A planta do museu (em metros; x para leste, z para sul, y para cima).
// Cada espaço é um retângulo com paredes do lado de fora e vãos nos lados.
// A mesma planta gera a arquitetura, as colisões, o mapa e a maquete da Sala 014.
import type { GaleriaId } from '../content/acervo'
import type { ChaveMat } from './base'

export type Lado = 'n' | 's' | 'l' | 'o'

export interface Vao {
  lado: Lado
  a: number
  b: number
  h: number
  /** porta (fechável) neste vão */
  porta?: string
  /** janela: altura do peitoril (o vão não chega ao chão) */
  peitoril?: number
}

export interface Espaco {
  id: string
  sala: GaleriaId
  x0: number
  x1: number
  z0: number
  z1: number
  h: number
  vaos: Vao[]
  piso: ChaveMat
  parede: ChaveMat
  teto: ChaveMat | null
  espessura?: number
  /** só aparece em certas condições (corredor de serviço) */
  oculto?: boolean
  /** fora da planta física (a Sala 014 real fica longe) */
  longe?: boolean
  /** desenho no mapa (quando diferente da posição física) */
  mapa?: { x0: number; x1: number; z0: number; z1: number }
  /** passagem entre duas paredes: as paredes laterais não avançam sobre as salas vizinhas */
  semCantos?: boolean
}

export const PE_DIREITO = 6

export const ESPACOS: Espaco[] = [
  {
    id: 'atrio',
    sala: 'atrio',
    x0: -11,
    x1: 11,
    z0: -11,
    z1: 11,
    h: 14,
    piso: 'piso',
    parede: 'forma',
    teto: null,
    vaos: [
      { lado: 'o', a: -2.5, b: 2.5, h: 4.5 },
      { lado: 'l', a: -2.5, b: 2.5, h: 4.5 },
      { lado: 'n', a: -2.5, b: 2.5, h: 4.5 },
      { lado: 's', a: -3, b: 3, h: 4.2, porta: 'entrada' },
    ],
  },
  {
    id: 'g01',
    sala: 'g01',
    x0: -33,
    x1: -11.8,
    z0: -8,
    z1: 8,
    h: PE_DIREITO,
    piso: 'piso',
    parede: 'gesso',
    teto: 'teto',
    vaos: [
      { lado: 'l', a: -2.5, b: 2.5, h: 4.5 },
      { lado: 'o', a: -1.5, b: 1.5, h: 3 },
      { lado: 'n', a: -24, b: -20, h: 4 },
    ],
  },
  {
    id: 'escada',
    sala: 'escada',
    x0: -44,
    x1: -33.8,
    z0: -5.2,
    z1: 5.2,
    h: 0,
    piso: 'granilite',
    parede: 'forma',
    teto: null,
    vaos: [{ lado: 'l', a: -1.5, b: 1.5, h: 3 }],
  },
  {
    id: 'g02',
    sala: 'g02',
    x0: -8,
    x1: 8,
    z0: -33,
    z1: -11.8,
    h: PE_DIREITO,
    piso: 'madeira',
    parede: 'gesso',
    teto: 'teto',
    vaos: [
      { lado: 's', a: -2.5, b: 2.5, h: 4.5 },
      { lado: 'l', a: -24, b: -20, h: 4 },
      { lado: 'o', a: -24, b: -20, h: 4 },
    ],
  },
  {
    id: 'p24',
    semCantos: true,
    sala: 'g04',
    x0: 8,
    x1: 11.8,
    z0: -24,
    z1: -20,
    h: 4,
    piso: 'piso',
    parede: 'gesso',
    teto: 'teto',
    vaos: [
      { lado: 'o', a: -24, b: -20, h: 4 },
      { lado: 'l', a: -24, b: -20, h: 4 },
    ],
  },
  {
    id: 'p25',
    semCantos: true,
    sala: 'g05',
    x0: -11.8,
    x1: -8,
    z0: -24,
    z1: -20,
    h: 4,
    piso: 'piso',
    parede: 'gesso',
    teto: 'teto',
    vaos: [
      { lado: 'o', a: -24, b: -20, h: 4 },
      { lado: 'l', a: -24, b: -20, h: 4 },
    ],
  },
  {
    id: 'g03',
    sala: 'g03',
    x0: 11.8,
    x1: 33,
    z0: -8,
    z1: 8,
    h: PE_DIREITO,
    piso: 'piso',
    parede: 'gesso',
    teto: 'teto',
    vaos: [
      { lado: 'o', a: -2.5, b: 2.5, h: 4.5 },
      { lado: 'n', a: 20, b: 24, h: 4 },
      { lado: 's', a: 19.9, b: 24.1, h: 3.5, peitoril: 0.85 },
    ],
  },
  {
    id: 'g04',
    sala: 'g04',
    x0: 11.8,
    x1: 33,
    z0: -33,
    z1: -8.8,
    h: PE_DIREITO,
    piso: 'piso',
    parede: 'grafite',
    teto: 'teto',
    vaos: [
      { lado: 's', a: 20, b: 24, h: 4 },
      { lado: 'o', a: -24, b: -20, h: 4 },
    ],
  },
  {
    id: 'g05',
    sala: 'g05',
    x0: -33,
    x1: -11.8,
    z0: -33,
    z1: -8.8,
    h: PE_DIREITO,
    piso: 'piso',
    parede: 'gesso',
    teto: 'teto',
    vaos: [
      { lado: 's', a: -24, b: -20, h: 4 },
      { lado: 'l', a: -24, b: -20, h: 4 },
      { lado: 'n', a: -23, b: -21, h: 2.6, porta: 'servico' },
    ],
  },
  {
    id: 'servico',
    sala: 'servico',
    x0: -25,
    x1: -5,
    z0: -38.8,
    z1: -33.8,
    h: 3.4,
    piso: 'servico',
    parede: 'gesso',
    teto: 'teto',
    oculto: true,
    vaos: [
      { lado: 's', a: -23, b: -21, h: 2.6 },
      { lado: 'l', a: -37.3, b: -35.5, h: 2.4, porta: '014' },
    ],
  },
  {
    id: 'vestibulo',
    sala: 'servico',
    x0: -4.2,
    x1: -1.2,
    z0: -37.6,
    z1: -35.2,
    h: 2.8,
    piso: 'servico',
    parede: 'gesso',
    teto: 'teto',
    oculto: true,
    espessura: 0.4,
    vaos: [
      { lado: 'o', a: -37.3, b: -35.5, h: 2.4 },
      { lado: 'l', a: -37.3, b: -35.5, h: 2.4, porta: 'vest-a' },
    ],
  },
  {
    // a Sala 014 de verdade fica longe; no mapa ela aparece sobre a Galeria 02
    id: 's014',
    sala: 's014',
    x0: 400.6,
    x1: 414,
    z0: -43,
    z1: -29.6,
    h: 5,
    piso: 'nogueira',
    parede: 'gesso',
    teto: 'teto',
    oculto: true,
    longe: true,
    vaos: [{ lado: 'o', a: -37.3, b: -35.5, h: 2.4 }],
    mapa: { x0: -0.4, x1: 13, z0: -43, z1: -29.6 },
  },
  {
    id: 'vestibulo-b',
    sala: 's014',
    x0: 396.8,
    x1: 399.8,
    z0: -37.6,
    z1: -35.2,
    h: 2.8,
    piso: 'servico',
    parede: 'gesso',
    teto: 'teto',
    oculto: true,
    longe: true,
    espessura: 0.4,
    vaos: [
      { lado: 'o', a: -37.3, b: -35.5, h: 2.4, porta: 'vest-b0' },
      { lado: 'l', a: -37.3, b: -35.5, h: 2.4, porta: 'vest-b' },
    ],
  },
]

/** distância entre os dois vestíbulos (o salto da Sala 014) */
export const SALTO_014 = 401

/** A Sala (004): um cômodo dentro da Galeria 02 */
export const SALA004 = { x0: -6.6, x1: -1.8, z0: -31.2, z1: -26.4, h: 3.2, porta: { z0: -29.4, z1: -28.2 } }

/** o hall da escada infinita */
export const ESCADA = {
  H: 4.2,
  x0: -44,
  x1: -33.8,
  z0: -5.2,
  z1: 5.2,
  // lance A (sobe para o norte), patamar do meio, lance B (sobe para o sul)
  a: { x0: -43.6, x1: -41.2 },
  b: { x0: -39.6, x1: -37.2 },
  zBase: 2.4,
  zTopo: -1.2,
  patamarZ0: -5.2,
  // faixa do lado leste, no nível do piso, que leva à porta da Galeria 01
  faixaX0: -37.2,
}

export function espacoEm(x: number, z: number): Espaco | null {
  for (const e of ESPACOS) {
    if (e.oculto && e.longe && x < 300) continue
    const m = 0.05
    if (x >= e.x0 - m && x <= e.x1 + m && z >= e.z0 - m && z <= e.z1 + m) return e
  }
  // a espessura das paredes entre espaços (nos vãos) conta como o espaço mais próximo
  let melhor: Espaco | null = null
  let dist = 1.2
  for (const e of ESPACOS) {
    const dx = Math.max(e.x0 - x, 0, x - e.x1)
    const dz = Math.max(e.z0 - z, 0, z - e.z1)
    const d = Math.hypot(dx, dz)
    if (d < dist) {
      dist = d
      melhor = e
    }
  }
  return melhor
}

export const dentroSala004 = (x: number, z: number) => x > SALA004.x0 && x < SALA004.x1 && z > SALA004.z0 && z < SALA004.z1

/** pontos de interesse: onde a câmera para diante de cada obra (e o tour do celular) */
export interface Ponto {
  id: string
  sala: GaleriaId
  pos: [number, number]
  yaw: number
  pitch?: number
  obra?: string
  /** só passagem (o tour segue direto) */
  passagem?: boolean
}

// yaw: 0 olha para o norte (-z); positivo gira para a esquerda (oeste)
export const PONTOS: Ponto[] = [
  { id: 'entrada', sala: 'atrio', pos: [0, 8.6], yaw: 0 },
  { id: 'atrio-centro', sala: 'atrio', pos: [0, 1], yaw: 0.4 },
  { id: 'recepcao', sala: 'atrio', pos: [6.4, 6.95], yaw: 0, pitch: -0.5 },
  { id: 'g01-entrada', sala: 'g01', pos: [-14.5, 0], yaw: Math.PI / 2 },
  { id: 'obra-006', sala: 'g01', pos: [-26.9, -3.0], yaw: 0.03, pitch: -0.1, obra: '006' },
  { id: 'obra-001', sala: 'g01', pos: [-30.4, 0], yaw: Math.PI / 2, obra: '001' },
  { id: 'escada-base', sala: 'escada', pos: [-39.4, 4.6], yaw: 0.32, pitch: 0.14 },
  { id: 'g05-entrada', sala: 'g05', pos: [-22, -12], yaw: 0 },
  { id: 'g05-centro', sala: 'g05', pos: [-22, -24], yaw: 0.2 },
  { id: 'servico', sala: 'servico', pos: [-15, -36.3], yaw: -Math.PI / 2 },
  { id: 'porta-014', sala: 'servico', pos: [-6.6, -36.4], yaw: -Math.PI / 2 },
  { id: 'vestibulo', sala: 'servico', pos: [-2.1, -36.4], yaw: -Math.PI / 2 },
  { id: 's014-maquete', sala: 's014', pos: [404.6, -36.4], yaw: -Math.PI / 2, pitch: -0.42 },
  { id: 's014-mesa', sala: 's014', pos: [411.4, -39.4], yaw: 0, pitch: -0.5 },
  { id: 'g02-entrada', sala: 'g02', pos: [0, -15], yaw: 0 },
  { id: 'leitura', sala: 'g02', pos: [4, -27.9], yaw: 0, pitch: -0.24 },
  { id: 'obra-004', sala: 'g02', pos: [1.2, -28.8], yaw: Math.PI / 2, obra: '004' },
  { id: 'sala004', sala: 'sala004', pos: [-2.6, -28.8], yaw: Math.PI / 2 - 0.25 },
  { id: 'removida', sala: 'g02', pos: [3.6, -19], yaw: -Math.PI / 2 },
  { id: 'g04-entrada', sala: 'g04', pos: [14.5, -22], yaw: -Math.PI / 2 },
  { id: 'obra-005', sala: 'g04', pos: [24, -29.6], yaw: 0, pitch: 0.1, obra: '005' },
  { id: 'obra-002', sala: 'g04', pos: [28.6, -21], yaw: -Math.PI / 2, obra: '002' },
  { id: 'g03-entrada', sala: 'g03', pos: [22, -5], yaw: Math.PI, passagem: true },
  { id: 'obra-007', sala: 'g03', pos: [22, 3.9], yaw: Math.PI, obra: '007' },
  { id: 'obra-003', sala: 'g03', pos: [27.4, 0], yaw: -Math.PI / 2, pitch: 0.26, obra: '003' },
  { id: 'g03-saida', sala: 'g03', pos: [14.5, 0], yaw: Math.PI / 2 },
]

export const PONTO = Object.fromEntries(PONTOS.map((p) => [p.id, p])) as Record<string, Ponto>

/** a ordem do passeio no celular (os pontos escondidos entram quando existem) */
export const TOUR = [
  'entrada',
  'atrio-centro',
  'recepcao',
  'g01-entrada',
  'obra-006',
  'obra-001',
  'escada-base',
  'g05-entrada',
  'g05-centro',
  'servico',
  'porta-014',
  'vestibulo',
  'leitura',
  'obra-004',
  'sala004',
  'removida',
  'g04-entrada',
  'obra-005',
  'obra-002',
  'g03-entrada',
  'obra-007',
  'obra-003',
  'g03-saida',
]

/** o tour dentro da Sala 014 */
export const TOUR_014 = ['s014-maquete', 's014-mesa']

/** direção do olhar (yaw) para ir de a até b */
export const yawPara = (dx: number, dz: number) => Math.atan2(-dx, -dz)
