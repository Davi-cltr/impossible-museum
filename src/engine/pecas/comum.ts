// O que as obras e os objetos do museu compartilham: o contexto do motor, os alvos do cursor,
// placas de parede, folhas de papel e sombras de contato.
import * as THREE from 'three'
import type { GaleriaId } from '../../content/acervo'
import { OBRA } from '../../content/acervo'
import { lt, tr } from '../../content/textos'
import type { Qualidade } from '../../core/estado'
import { canvasTexto, FONTE_SERIF, type Materiais } from '../base'
import type { Jogador } from '../jogador'
import type { Luzes } from '../luzes'
import { desenharPlaca, letreiro, type Letreiro, type Mundo } from '../mundo'
import type { Porta } from '../portas'

export type TipoAlvo = 'obra' | 'porta' | 'documento' | 'objeto' | 'trancada'

export interface Interativo {
  objetos: THREE.Object3D[]
  tipo: () => TipoAlvo
  rotulo: () => string
  /** distância máxima para agir (m) */
  distancia?: number
  ativo?: () => boolean
  acao: () => void
}

export interface Contexto {
  cena: THREE.Scene
  mats: Materiais
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  jogador: Jogador
  mundo: Mundo
  luzes: Luzes
  portas: Record<string, Porta>
  qualidade: Qualidade
  interativos: Interativo[]
  letreiros: Letreiro[]
  sala: () => GaleriaId
  /** o visitante está olhando para este ponto? */
  olhando: (p: THREE.Vector3, ang: number, dist: number) => boolean
  abrirDocumento: (id: string) => void
  irParaPonto: (id: string) => void
  pedirSombras: () => void
  /** registra uma descoberta (obra observada, anomalia, segredo) e avisa */
  descobrir: (tipo: 'obra' | 'anomalia' | 'achada' | 'segredo', id: string, aviso?: string) => boolean
  tempo: () => number
}

export interface Peca {
  atualizar?(dt: number, c: Contexto): void
  /** a cada passo do visitante */
  aoPasso?(c: Contexto): void
  /** quando o visitante para de andar */
  aoParar?(c: Contexto): void
}

/** materiais simples para móveis e objetos que se movem (sem textura de mundo) */
export function materiaisMoveis() {
  return {
    carvalho: new THREE.MeshStandardMaterial({ color: '#a9825c', roughness: 0.62 }),
    nogueira: new THREE.MeshStandardMaterial({ color: '#5b3e2c', roughness: 0.55 }),
    pintado: new THREE.MeshStandardMaterial({ color: '#e8e5de', roughness: 0.8 }),
    ferro: new THREE.MeshStandardMaterial({ color: '#2b2b2c', roughness: 0.55, metalness: 0.7 }),
    linho: new THREE.MeshStandardMaterial({ color: '#cfc6b4', roughness: 0.95 }),
    tapete: new THREE.MeshStandardMaterial({ color: '#6e4a3a', roughness: 1 }),
    porcelana: new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.25 }),
    porta: new THREE.MeshStandardMaterial({ color: '#7a5a43', roughness: 0.6 }),
    painel: new THREE.MeshStandardMaterial({ color: '#ecebe7', roughness: 0.9 }),
    acoPorta: new THREE.MeshStandardMaterial({ color: '#45474a', roughness: 0.42, metalness: 0.65 }),
  }
}
export type MatsMoveis = ReturnType<typeof materiaisMoveis>

/** uma caixa avulsa (não fundida), com sombra */
export function caixa(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  g.position.set(x, y, z)
  g.castShadow = g.receiveShadow = true
  return g
}

let texBlob: THREE.Texture | null = null
/** sombra de contato desfocada sob um objeto (barata e convincente) */
export function sombraContato(w: number, d: number, forca = 0.55, x?: number, z?: number, y = 0.004) {
  if (!texBlob)
    texBlob = canvasTexto(
      128,
      128,
      (g, W, H) => {
        const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2)
        gr.addColorStop(0, 'rgba(0,0,0,1)')
        gr.addColorStop(0.45, 'rgba(0,0,0,0.55)')
        gr.addColorStop(1, 'rgba(0,0,0,0)')
        g.fillStyle = gr
        g.fillRect(0, 0, W, H)
      },
      1,
    )
  const m = new THREE.MeshBasicMaterial({ map: texBlob, transparent: true, opacity: forca, depthWrite: false, color: '#000000' })
  m.polygonOffset = true
  m.polygonOffsetFactor = -2
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m)
  p.rotation.x = -Math.PI / 2
  p.position.set(x ?? 0, y, z ?? 0)
  p.renderOrder = 1
  return p
}

/** uma folha de papel com linhas de escrita miúda */
export function folha(w: number, d: number, { manuscrito = false, cor = '#f1ede3', semente = 1 } = {}) {
  const tex = canvasTexto(
    w * 1200,
    d * 1200,
    (g, W, H) => {
      g.fillStyle = cor
      g.fillRect(0, 0, W, H)
      const pad = W * 0.12
      g.strokeStyle = manuscrito ? 'rgba(40,36,60,0.55)' : 'rgba(30,30,30,0.5)'
      g.lineWidth = Math.max(1, H * 0.006)
      let r = semente * 9301
      const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280)
      for (let y = H * 0.16; y < H * 0.86; y += H * 0.055) {
        const fim = W - pad - rnd() * W * (y > H * 0.7 ? 0.5 : 0.12)
        g.beginPath()
        let x = pad
        g.moveTo(x, y)
        while (x < fim) {
          x += W * (0.015 + rnd() * 0.05)
          g.lineTo(Math.min(x, fim), y + (manuscrito ? (rnd() - 0.5) * H * 0.01 : 0))
          if (rnd() < 0.18) {
            x += W * 0.02
            g.moveTo(x, y)
          }
        }
        g.stroke()
      }
      if (manuscrito) {
        g.fillStyle = 'rgba(40,36,60,0.65)'
        g.font = `italic 400 ${H * 0.08}px ${FONTE_SERIF}`
        g.fillText('— C.', W * 0.62, H * 0.93)
      }
    },
    1,
  )
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
  const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.002, d), m)
  p.castShadow = false
  p.receiveShadow = true
  return p
}

/** placa de parede de uma obra; clicar leva até ela */
export function placaObra(c: Contexto, id: string, pos: [number, number, number], ry: number, { largura = 0.42, altura = 0.3 } = {}): Letreiro {
  const o = OBRA[id]
  const l = letreiro(
    largura,
    altura,
    desenharPlaca(
      () => `${tr('obra')} ${id}`,
      () => lt(o.titulo),
      () => [lt(o.classificacao), lt(o.descoberta)],
    ),
    { resolucao: 1300, transparente: false },
  )
  l.malha.position.set(...pos)
  l.malha.rotation.y = ry
  c.cena.add(l.malha)
  c.letreiros.push(l)
  return l
}

/** texto pintado direto na parede (títulos das galerias) */
export function textoParede(
  c: Contexto,
  linhas: () => { texto: string; tamanho: number; serif?: boolean; cor?: string; espaco?: number }[],
  largura: number,
  altura: number,
  pos: [number, number, number],
  ry: number,
  alinhamento: CanvasTextAlign = 'left',
) {
  const l = letreiro(
    largura,
    altura,
    (g, w, h) => {
      g.clearRect(0, 0, w, h)
      let y = 0
      g.textBaseline = 'top'
      g.textAlign = alinhamento
      const x = alinhamento === 'center' ? w / 2 : alinhamento === 'right' ? w : 0
      for (const li of linhas()) {
        const px = li.tamanho * h
        g.font = `${li.serif ? 400 : 500} ${px}px ${li.serif ? FONTE_SERIF : '"Geist Variable", Arial, sans-serif'}`
        g.fillStyle = li.cor ?? '#1d1c1a'
        if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(li.espaco ?? 0) * px}px`
        g.fillText(li.texto, x, y)
        y += px * 1.25
      }
    },
    { resolucao: 220 },
  )
  l.malha.position.set(...pos)
  l.malha.rotation.y = ry
  l.malha.receiveShadow = true
  c.cena.add(l.malha)
  c.letreiros.push(l)
  return l
}

/** marca um objeto (e filhos) como alvo do cursor */
export function alvo(c: Contexto, i: Interativo) {
  c.interativos.push(i)
  return i
}
