// Estado do museu: a memória (guardada no navegador, o museu lembra de quem volta)
// e a sessão (o que está acontecendo agora). Fora do React, com um gancho para ler.
import { useSyncExternalStore } from 'react'
import type { GaleriaId, Lang } from '../content/acervo'

export type Qualidade = 'alta' | 'media' | 'baixa'

export interface Memoria {
  versao: 1
  primeiraVisita: string
  ultimaVisita: string
  visitas: number
  salas: GaleriaId[]
  /** obras observadas de perto */
  obras: string[]
  /** anomalias percebidas (o arquivo passa a descrevê-las) */
  anomalias: string[]
  /** obras desconhecidas que foram encontradas */
  achadas: string[]
  documentos: string[]
  segredos: string[]
  /** quantas vezes A Sala mudou */
  sala004: number
  pinturaDesviou: boolean
  escadaMaisAlta: number
  lang: Lang
  qualidade: Qualidade | 'auto'
  som: boolean
  reduzido: boolean | null
}

const CHAVE = 'impossible-museum:v1'

function nova(): Memoria {
  const agora = new Date().toISOString()
  const ptNavegador = typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt')
  return {
    versao: 1,
    primeiraVisita: agora,
    ultimaVisita: agora,
    visitas: 0,
    salas: [],
    obras: [],
    anomalias: [],
    achadas: [],
    documentos: [],
    segredos: [],
    sala004: 0,
    pinturaDesviou: false,
    escadaMaisAlta: 1,
    lang: ptNavegador ? 'pt' : 'en',
    qualidade: 'auto',
    som: true,
    reduzido: null,
  }
}

function carregar(): Memoria {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) return { ...nova(), ...JSON.parse(bruto) }
  } catch {
    /* navegação privada ou armazenamento bloqueado: o museu esquece, mas funciona */
  }
  return nova()
}

export type Painel = 'nenhum' | 'arquivo' | 'mapa' | 'documento' | 'ajustes'

export interface Sessao {
  fase: 'entrada' | 'chegando' | 'museu'
  painel: Painel
  documento: string | null
  obraArquivo: string | null
  /** obra diante do visitante (placa aberta) */
  obraPerto: string | null
  sala: GaleriaId
  /** nível virtual da escada (1 = térreo) */
  nivel: number
  /** dica do cursor sobre o que está apontado */
  alvo: { tipo: 'andar' | 'obra' | 'porta' | 'documento' | 'objeto' | 'trancada'; rotulo?: string } | null
  avisos: { id: number; texto: string; tipo: 'obra' | 'segredo' | 'info' }[]
  carregado: number
  pronto: boolean
  toque: boolean
  qualidade: Qualidade
  reduzido: boolean
  tour: number
  falhaGL: boolean
}

const media = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches

function qualidadeAuto(): Qualidade {
  const toque = media('(pointer: coarse)')
  const nucleos = navigator.hardwareConcurrency || 4
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8
  if (toque) return 'baixa'
  if (nucleos >= 8 && mem >= 8) return 'alta'
  return 'media'
}

export const memoria: Memoria = carregar()

export const sessao: Sessao = {
  fase: 'entrada',
  painel: 'nenhum',
  documento: null,
  obraArquivo: null,
  obraPerto: null,
  sala: 'atrio',
  nivel: 1,
  alvo: null,
  avisos: [],
  carregado: 0,
  pronto: false,
  toque: media('(pointer: coarse)'),
  qualidade: memoria.qualidade === 'auto' ? qualidadeAuto() : memoria.qualidade,
  reduzido: memoria.reduzido ?? media('(prefers-reduced-motion: reduce)'),
  tour: 0,
  falhaGL: false,
}

const ouvintes = new Set<() => void>()
let versao = 0
const avisar = () => {
  versao++
  ouvintes.forEach((f) => f())
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(memoria))
  } catch {
    /* sem armazenamento */
  }
}

export function mudarSessao(p: Partial<Sessao>) {
  Object.assign(sessao, p)
  avisar()
}

export function mudarMemoria(p: Partial<Memoria>) {
  Object.assign(memoria, p)
  salvar()
  avisar()
}

/** acrescenta um item a uma lista da memória; devolve true se for novo */
export function lembrar(lista: 'salas' | 'obras' | 'anomalias' | 'achadas' | 'documentos' | 'segredos', item: string) {
  const l = memoria[lista] as string[]
  if (l.includes(item)) return false
  l.push(item)
  salvar()
  avisar()
  return true
}

export const sabe = (lista: 'salas' | 'obras' | 'anomalias' | 'achadas' | 'documentos' | 'segredos', item: string) =>
  (memoria[lista] as string[]).includes(item)

let idAviso = 0
export function aviso(texto: string, tipo: 'obra' | 'segredo' | 'info' = 'info') {
  const id = ++idAviso
  sessao.avisos = [...sessao.avisos, { id, texto, tipo }]
  avisar()
  setTimeout(() => {
    sessao.avisos = sessao.avisos.filter((a) => a.id !== id)
    avisar()
  }, 6200)
}

export function registrarVisita() {
  memoria.visitas += 1
  memoria.ultimaVisita = new Date().toISOString()
  salvar()
}

export function esquecerTudo() {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    /* sem armazenamento */
  }
  location.reload()
}

function inscrever(f: () => void) {
  ouvintes.add(f)
  return () => {
    ouvintes.delete(f)
  }
}

/** lê o estado e re-renderiza quando ele muda */
export function useMuseu<T>(ler: (s: Sessao, m: Memoria) => T): T {
  useSyncExternalStore(
    inscrever,
    () => versao,
    () => versao,
  )
  return ler(sessao, memoria)
}

export { inscrever }
