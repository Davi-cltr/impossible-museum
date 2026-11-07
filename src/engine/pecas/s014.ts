// A Sala 014 e o caminho até ela: o vestíbulo que escurece e leva para longe (a sala não cabe
// na planta), a maquete do museu com uma luz onde o visitante está, a mesa do Curador e as
// caixas das obras 009 a 013.
import * as THREE from 'three'
import { tr } from '../../content/textos'
import { som } from '../../core/som'
import { ACENTO, canvasTexto, FONTE_SANS, FONTE_SERIF, montar, type Caixa } from '../base'
import { paredesDe } from '../mundo'
import { ESCADA, ESPACOS, SALTO_014 } from '../planta'
import { Porta } from '../portas'
import { alvo, caixa, folha, materiaisMoveis, sombraContato, type Contexto, type Peca } from './comum'

const ESCALA = 1 / 40
const MESA = new THREE.Vector3(407.3, 0.92, -36.3)
const CENTRO_PLANTA = new THREE.Vector2(-5.5, -4.5)

/** posição no mapa (a sala 014 e o vestíbulo B aparecem dentro da planta) */
export const noMapa = (x: number) => (x > 300 ? x - SALTO_014 : x)

function maquete(c: Contexto) {
  const caixas: Caixa[] = []
  for (const e of ESPACOS) {
    if (e.longe && e.id !== 's014') continue
    const ee = e.mapa ? { ...e, ...e.mapa, longe: false } : e
    const h = e.id === 'escada' ? ESCADA.H : e.h
    const paredes = paredesDe({ ...ee, h: Math.max(h, 2.6) })
    caixas.push(...paredes.filter((p) => p.m !== 'luz' && p.m !== 'vidro' && p.p[1] > -0.2))
  }
  const escalonadas: Caixa[] = caixas.map((k) => ({
    ...k,
    m: 'pedestal',
    p: [(k.p[0] - CENTRO_PLANTA.x) * ESCALA + MESA.x, k.p[1] * ESCALA * 0.55 + MESA.y + 0.004, (k.p[2] - CENTRO_PLANTA.y) * ESCALA + MESA.z],
    s: [k.s[0] * ESCALA, k.s[1] * ESCALA * 0.55, k.s[2] * ESCALA],
    colide: false,
  }))
  const g = montar(escalonadas, c.mats, { sombra: false })
  g.traverse((o) => (o.receiveShadow = true))
  c.cena.add(g)
  // a sala 014 na maquete, em vermelho apagado (ela está desenhada sobre a Galeria 02)
  const s = ESPACOS.find((e) => e.id === 's014')!.mapa!
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry((s.x1 - s.x0) * ESCALA, (s.z1 - s.z0) * ESCALA),
    new THREE.MeshStandardMaterial({ color: ACENTO, roughness: 0.8, transparent: true, opacity: 0.35, depthWrite: false }),
  )
  piso.rotation.x = -Math.PI / 2
  piso.position.set(((s.x0 + s.x1) / 2 - CENTRO_PLANTA.x) * ESCALA + MESA.x, MESA.y + 0.006, ((s.z0 + s.z1) / 2 - CENTRO_PLANTA.y) * ESCALA + MESA.z)
  c.cena.add(piso)
  // a luz do visitante
  const ponto = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(3) }))
  const brilho = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: canvasTexto(
        64,
        64,
        (q, w, h) => {
          const gr = q.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
          gr.addColorStop(0, 'rgba(255,220,160,0.9)')
          gr.addColorStop(0.3, 'rgba(255,190,120,0.3)')
          gr.addColorStop(1, 'rgba(255,170,90,0)')
          q.fillStyle = gr
          q.fillRect(0, 0, w, h)
        },
        1,
      ),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  )
  brilho.scale.setScalar(0.16)
  ponto.add(brilho)
  c.cena.add(ponto)
  return ponto
}

function mesaCurador(c: Contexto) {
  const m = materiaisMoveis()
  const g = new THREE.Group()
  g.position.set(411.6, 0, -41.6)
  g.add(caixa(1.5, 0.045, 0.72, m.nogueira, 0, 0.75, 0))
  for (const [x, z] of [
    [-0.7, -0.32],
    [0.7, -0.32],
    [-0.7, 0.32],
    [0.7, 0.32],
  ])
    g.add(caixa(0.045, 0.73, 0.045, m.nogueira, x, 0.365, z))
  g.add(caixa(0.45, 0.6, 0.6, m.nogueira, 0.48, 0.42, 0))
  // abajur
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 24), c.mats.latao)
  base.position.set(0.5, 0.782, -0.15)
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 8), c.mats.latao)
  haste.position.set(0.5, 1.0, -0.15)
  const cup = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.14, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: '#efe3c8', side: THREE.DoubleSide, roughness: 0.6, emissive: '#ffc27a', emissiveIntensity: 0.6 }),
  )
  cup.position.set(0.5, 1.22, -0.15)
  g.add(base, haste, cup)
  const carta = folha(0.21, 0.297, { manuscrito: true, semente: 40 })
  carta.position.set(-0.15, 0.775, 0.05)
  carta.rotation.y = -0.1
  g.add(carta)
  // cadeira afastada, como se alguém tivesse acabado de levantar
  const cad = new THREE.Group()
  cad.add(caixa(0.46, 0.04, 0.44, m.nogueira, 0, 0.46, 0))
  for (const [x, z] of [
    [-0.2, -0.19],
    [0.2, -0.19],
    [-0.2, 0.19],
    [0.2, 0.19],
  ])
    cad.add(caixa(0.035, 0.46, 0.035, m.nogueira, x, 0.23, z))
  cad.add(caixa(0.44, 0.5, 0.03, m.nogueira, 0, 0.72, 0.2))
  cad.position.set(-0.25, 0, 0.85)
  cad.rotation.y = 0.5
  g.add(cad)
  g.add(sombraContato(2.0, 1.2, 0.5, 0, 0, 0.004))
  c.cena.add(g)
  c.mundo.blocos.push({ x0: 410.8, x1: 412.4, z0: -42.0, z1: -41.2, baixo: true }, { x0: 411.1, x1: 411.6, z0: -41.0, z1: -40.5, baixo: true })
  alvo(c, { objetos: [carta], tipo: () => 'documento', rotulo: () => tr('ler'), distancia: 4, acao: () => c.abrirDocumento('carta-final') })
}

function caixotes(c: Contexto) {
  const madeira = new THREE.MeshStandardMaterial({ color: '#a8875e', roughness: 0.85 })
  const lista: [string, number, number, number, number][] = [
    ['009', 402.4, 0.35, -30.2, 0.1],
    ['010', 403.5, 0.35, -30.25, -0.05],
    ['011', 403.0, 1.05, -30.25, 0.08],
    ['012', 405.0, 0.35, -30.3, 0.02],
    ['013', 412.8, 0.35, -30.4, -0.2],
  ]
  for (const [n, x, y, z, ry] of lista) {
    const tex = canvasTexto(
      300,
      240,
      (g, w, h) => {
        g.fillStyle = '#a8875e'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = 'rgba(70,50,30,0.35)'
        for (let i = 0; i < 6; i++) {
          g.beginPath()
          g.moveTo(0, (i + 1) * (h / 7))
          g.lineTo(w, (i + 1) * (h / 7))
          g.stroke()
        }
        g.fillStyle = 'rgba(25,22,20,0.85)'
        g.font = `600 ${h * 0.32}px ${FONTE_SANS}`
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText(n, w / 2, h * 0.46)
        g.font = `500 ${h * 0.08}px ${FONTE_SANS}`
        g.fillText('DEACCESSIONED · BAIXA', w / 2, h * 0.75)
      },
      1,
    )
    const frente = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })
    const cx = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.7), [madeira, madeira, madeira, madeira, madeira, frente])
    cx.position.set(x, y, z)
    cx.rotation.y = Math.PI + ry
    cx.castShadow = cx.receiveShadow = true
    c.cena.add(cx)
    if (y < 1) {
      c.cena.add(sombraContato(1.2, 1.0, 0.5, x, z, 0.004))
      c.mundo.blocos.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.45, z1: z + 0.45, baixo: true })
    }
  }
}

/** a planta emoldurada na parede: a sala 014 aparece onde não caberia */
function plantaEmoldurada(c: Contexto) {
  const tex = canvasTexto(
    960,
    660,
    (g, w, h) => {
      g.fillStyle = '#efece4'
      g.fillRect(0, 0, w, h)
      const esc = 9
      const ox = w / 2 - CENTRO_PLANTA.x * esc
      const oy = h / 2 - CENTRO_PLANTA.y * esc + 10
      g.strokeStyle = '#2a2826'
      g.lineWidth = 2
      for (const e of ESPACOS) {
        if (e.longe && e.id !== 's014') continue
        const r = e.mapa ?? e
        if (e.id === 's014') {
          g.strokeStyle = ACENTO
          g.setLineDash([6, 5])
        } else {
          g.strokeStyle = '#2a2826'
          g.setLineDash([])
        }
        g.strokeRect(ox + r.x0 * esc, oy + r.z0 * esc, (r.x1 - r.x0) * esc, (r.z1 - r.z0) * esc)
      }
      g.setLineDash([])
      g.fillStyle = '#2a2826'
      g.font = `400 26px ${FONTE_SERIF}`
      g.fillText('The Impossible Museum — ground floor, 1:200', 30, h - 26)
      g.fillStyle = ACENTO
      g.font = `500 15px ${FONTE_SANS}`
      g.fillText('014', ox + 4 * esc, oy - 36 * esc)
    },
    1,
  )
  const g = new THREE.Group()
  g.add(caixa(1.64, 1.16, 0.04, new THREE.MeshStandardMaterial({ color: '#1d1a17', roughness: 0.6 })))
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.03), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }))
  tela.position.z = 0.022
  g.add(tela)
  g.position.set(413.97, 1.75, -36.3)
  g.rotation.y = -Math.PI / 2
  c.cena.add(g)
}

export function criarS014(c: Contexto): Peca {
  const mm = materiaisMoveis()
  // a mesa da maquete: um plinto branco
  c.cena.add(caixa(2.3, MESA.y, 2.3, c.mats.pedestal, MESA.x, MESA.y / 2, MESA.z))
  c.cena.add(sombraContato(3.0, 3.0, 0.5, MESA.x, MESA.z, 0.004))
  c.mundo.blocos.push({ x0: MESA.x - 1.15, x1: MESA.x + 1.15, z0: MESA.z - 1.15, z1: MESA.z + 1.15, baixo: true })
  const ponto = maquete(c)
  mesaCurador(c)
  caixotes(c)
  plantaEmoldurada(c)

  // os dois vestíbulos são idênticos; o painel de luz de cada um escurece na passagem
  const luzV = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fbf7ee').multiplyScalar(1.6) })
  for (const x of [-2.7, -2.7 + SALTO_014]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.6), luzV)
    p.position.set(x, 2.785, -36.4)
    c.cena.add(p)
  }
  const fixa = (id: string, x: number, abrePara: -1 | 1) => {
    const p = new Porta({ id, tipo: 'fixa', eixo: 'z', centro: [x, -36.4], largura: 1.8, altura: 2.4, espessura: 0.06, folha: mm.acoPorta, quadro: c.mats.acoClaro, som: 'aco', dobradica: -1, abrePara })
    c.portas[id] = p
    c.cena.add(p.grupo)
    c.mundo.blocos.push(p.bloco)
    return p
  }
  fixa('vest-a', -1.0, 1)
  fixa('vest-b0', -4.8 + SALTO_014, -1)
  const vestB = new Porta({
    id: 'vest-b',
    tipo: 'giro',
    eixo: 'z',
    centro: [-1.0 + SALTO_014, -36.4],
    largura: 1.8,
    altura: 2.4,
    espessura: 0.06,
    folha: mm.acoPorta,
    quadro: c.mats.acoClaro,
    som: 'aco',
    dobradica: -1,
    abrePara: 1,
  })
  vestB.aoMover = (abrindo) => som.porta('aco', abrindo)
  c.portas['vest-b'] = vestB
  c.cena.add(vestB.grupo)
  c.mundo.blocos.push(vestB.bloco)
  alvo(c, {
    objetos: vestB.alvos,
    tipo: () => 'porta',
    rotulo: () => (vestB.alvo > 0.5 ? tr('fecharPorta') : tr('abrir')),
    distancia: 4,
    acao: () => vestB.alternar(),
  })

  // a passagem
  type Fase = 'livre' | 'fechando' | 'escurecendo' | 'clareando'
  let fase: Fase = 'livre'
  let t0 = 0
  let sentido = 1
  let podeIr = true
  let podeVoltar = false
  const naA = (x: number, z: number) => x > -2.55 && x < -1.25 && z > -37.5 && z < -35.3
  const naB = (x: number, z: number) => x > -4.15 + SALTO_014 && x < -2.85 + SALTO_014 && z > -37.5 && z < -35.3
  let olhandoMaquete = 0
  return {
    atualizar(dt, cx) {
      const p = cx.jogador.pos
      const porta014 = cx.portas['014']
      const t = cx.tempo()
      if (p.x < -4.9 && p.x > -30) podeIr = true
      if (p.x > 400.7) podeVoltar = true
      if (fase === 'livre') {
        if (podeIr && naA(p.x, p.z) && porta014 && porta014.alvo > 0.5) {
          fase = 'fechando'
          sentido = 1
          t0 = t
          porta014.fechar()
          podeIr = false
        } else if (podeVoltar && naB(p.x, p.z) && vestB.alvo > 0.5) {
          fase = 'fechando'
          sentido = -1
          t0 = t
          vestB.fechar()
          podeVoltar = false
        }
      } else if (fase === 'fechando') {
        const porta = sentido > 0 ? porta014 : vestB
        if (porta.alvo > 0.5) porta.fechar()
        if (porta.abertura <= 0.001 && t - t0 > 1.3) {
          fase = 'escurecendo'
          t0 = t
          som.zumbido(true)
        }
      } else if (fase === 'escurecendo') {
        cx.luzes.vestibulo = Math.max(0.06, 1 - (t - t0) / 1.1)
        luzV.color.setScalar(1.6 * cx.luzes.vestibulo)
        if (t - t0 > 2.0) {
          cx.jogador.saltar(sentido * SALTO_014)
          fase = 'clareando'
          t0 = t
          som.sopro()
          som.zumbido(false)
        }
      } else if (fase === 'clareando') {
        cx.luzes.vestibulo = Math.min(1, 0.06 + (t - t0) / 1.2)
        luzV.color.setScalar(1.6 * cx.luzes.vestibulo)
        if (t - t0 > 0.6) {
          if (sentido > 0) vestB.abrir()
          else porta014?.abrir()
        }
        if (t - t0 > 1.3) {
          fase = 'livre'
          cx.luzes.vestibulo = 1
          luzV.color.setScalar(1.6)
        }
      }
      // na sala
      if (p.x > 400.7) {
        cx.descobrir('achada', '014')
        cx.descobrir('obra', '014')
        if (cx.olhando(MESA, 0.5, 5)) olhandoMaquete += dt
        if (olhandoMaquete > 2) cx.descobrir('anomalia', '014')
      }
      // a luz da maquete fica onde o visitante está
      const mx = noMapa(p.x)
      ponto.position.set((mx - CENTRO_PLANTA.x) * ESCALA + MESA.x, MESA.y + 0.1 + Math.sin(t * 1.3) * 0.006, (p.z - CENTRO_PLANTA.y) * ESCALA + MESA.z)
      const pisca = 0.85 + Math.sin(t * 2.1) * 0.08
      ponto.scale.setScalar(pisca)
    },
  }
}
