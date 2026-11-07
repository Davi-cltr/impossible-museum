// A arquitetura: paredes, pisos, tetos, o átrio com claraboia, a praça, a escada que se repete
// e as colisões. Tudo gerado a partir da planta, sala por sala (cada sala é um grupo, para o
// recorte da câmera e o raio do cursor descartarem o que está longe).
import * as THREE from 'three'
import { canvasTexto, FONTE_SANS, FONTE_SERIF, montar, type Caixa, type ChaveMat, type Materiais } from './base'
import { ESCADA, ESPACOS, SALA004, type Espaco, type Lado } from './planta'

export interface Bloco {
  x0: number
  x1: number
  z0: number
  z1: number
  /** só bloqueia enquanto isto for verdadeiro (portas fechadas, salas que ainda não existem) */
  ativo?: () => boolean
  /** obstáculo baixo (banco, mesa): não tapa a vista */
  baixo?: boolean
}

const T = 0.4

/** paredes de um espaço, com vãos, vergas e soleiras */
export function paredesDe(e: Espaco): Caixa[] {
  const t = e.espessura ?? T
  const ext = e.semCantos ? 0 : t
  const out: Caixa[] = []
  const h = e.h
  const lados: Lado[] = ['n', 's', 'o', 'l']
  for (const lado of lados) {
    const horizontal = lado === 'n' || lado === 's'
    const lo = horizontal ? e.x0 - ext : e.z0
    const hi = horizontal ? e.x1 + ext : e.z1
    const vaos = e.vaos.filter((v) => v.lado === lado).sort((a, b) => a.a - b.a)
    let cursor = lo
    const pedaco = (a: number, b: number, y0: number, y1: number, m: ChaveMat = e.parede, colide = y0 < 2) => {
      if (b - a < 0.01 || y1 - y0 < 0.01) return
      const c = (a + b) / 2
      const w = b - a
      const yc = (y0 + y1) / 2
      const hh = y1 - y0
      if (lado === 'n') out.push({ p: [c, yc, e.z0 - t / 2], s: [w, hh, t], m, colide })
      if (lado === 's') out.push({ p: [c, yc, e.z1 + t / 2], s: [w, hh, t], m, colide })
      if (lado === 'o') out.push({ p: [e.x0 - t / 2, yc, c], s: [t, hh, w], m, colide })
      if (lado === 'l') out.push({ p: [e.x1 + t / 2, yc, c], s: [t, hh, w], m, colide })
    }
    for (const v of vaos) {
      pedaco(cursor, v.a, -0.3, h)
      pedaco(v.a, v.b, v.h, h, e.parede, false)
      if (v.peitoril) pedaco(v.a, v.b, -0.3, v.peitoril, e.parede, true)
      else pedaco(v.a, v.b, -0.3, 0, e.piso, false)
      cursor = v.b
    }
    pedaco(cursor, hi, -0.3, h)
  }
  return out
}

function pisoTeto(e: Espaco): Caixa[] {
  const out: Caixa[] = []
  const w = e.x1 - e.x0
  const d = e.z1 - e.z0
  const cx = (e.x0 + e.x1) / 2
  const cz = (e.z0 + e.z1) / 2
  out.push({ p: [cx, -0.15, cz], s: [w, 0.3, d], m: e.piso, colide: false })
  if (e.teto) {
    const t = e.espessura ?? T
    const ex = e.semCantos ? 0 : t
    out.push({ p: [cx, e.h + 0.15, cz], s: [w + ex * 2, 0.3, d + t * 2], m: e.teto, colide: false })
  }
  return out
}

/** rasgos de luz no teto das galerias (a Galeria 05 fica no escuro) */
function rasgos(e: Espaco): Caixa[] {
  if (!e.teto || e.h < 5 || e.id === 'g05') return []
  const out: Caixa[] = []
  const w = e.x1 - e.x0
  const d = e.z1 - e.z0
  const aoLongoX = w >= d
  for (let i = 0; i < 2; i++) {
    const f = (i + 1) / 3
    if (aoLongoX) out.push({ p: [(e.x0 + e.x1) / 2, e.h - 0.005, e.z0 + d * f], s: [w - 3.2, 0.02, 0.2], m: 'luz', colide: false })
    else out.push({ p: [e.x0 + w * f, e.h - 0.005, (e.z0 + e.z1) / 2], s: [0.2, 0.02, d - 3.2], m: 'luz', colide: false })
  }
  return out
}

/** o átrio: anel de cobertura, claraboia com grelha de aço, recepção e bancos */
function atrio(): Caixa[] {
  const out: Caixa[] = []
  const y = 14
  out.push({ p: [0, y + 0.25, -9.7], s: [22.8, 0.5, 3.4], m: 'forma', colide: false })
  out.push({ p: [0, y + 0.25, 9.7], s: [22.8, 0.5, 3.4], m: 'forma', colide: false })
  out.push({ p: [-9.7, y + 0.25, 0], s: [3.4, 0.5, 16], m: 'forma', colide: false })
  out.push({ p: [9.7, y + 0.25, 0], s: [3.4, 0.5, 16], m: 'forma', colide: false })
  out.push({ p: [0, y + 0.32, 0], s: [16, 0.04, 16], m: 'vidro', colide: false, sombra: false })
  for (let k = -6; k <= 6; k += 2) {
    out.push({ p: [k, y + 0.05, 0], s: [0.09, 0.5, 16], m: 'aco', colide: false })
    out.push({ p: [0, y + 0.05, k], s: [16, 0.5, 0.09], m: 'aco', colide: false })
  }
  // recepção: bloco de travertino com tampo de carvalho
  out.push({ p: [6.2, 0.5, 5.6], s: [4.4, 1.0, 1.0], m: 'travertino' })
  out.push({ p: [6.2, 1.03, 5.6], s: [4.6, 0.06, 1.12], m: 'madeira', colide: false })
  // bancos
  for (const [x, z] of [
    [-5.6, -3.6],
    [5.6, -3.6],
    [-5.6, 3.2],
  ] as const)
    out.push({ p: [x, 0.22, z], s: [2.6, 0.44, 0.62], m: 'travertino' })
  return out
}

/** fora do prédio: praça, marquise, chão de cascalho com um furo na torre da escada, sebes */
function exterior(): Caixa[] {
  const out: Caixa[] = []
  out.push({ p: [0, -0.15, 22.5], s: [48, 0.3, 22.2], m: 'travertino', colide: false })
  out.push({ p: [-17.7, -0.15, 9.9], s: [12.6, 0.3, 3], m: 'travertino', colide: false })
  out.push({ p: [13.85, -0.15, 9.9], s: [4.9, 0.3, 3], m: 'travertino', colide: false })
  out.push({ p: [-24.2, 0.35, 21], s: [0.4, 0.7, 25.6], m: 'travertino' })
  out.push({ p: [24.2, 0.35, 22.62], s: [0.4, 0.7, 22.36], m: 'travertino' })
  out.push({ p: [0, 0.35, 33.8], s: [48.8, 0.7, 0.4], m: 'travertino' })
  // marquise de concreto sobre a entrada
  out.push({ p: [0, 4.75, 14.4], s: [14, 0.3, 6], m: 'forma', colide: false })
  out.push({ p: [-6.6, 2.3, 16.9], s: [0.22, 4.6, 0.22], m: 'aco' })
  out.push({ p: [6.6, 2.3, 16.9], s: [0.22, 4.6, 0.22], m: 'aco' })
  // sebes baixas
  out.push({ p: [-17, 0.45, 21], s: [12, 0.9, 1.2], m: 'sebe' })
  out.push({ p: [17, 0.45, 21], s: [12, 0.9, 1.2], m: 'sebe' })
  out.push({ p: [-17, 0.45, 28], s: [12, 0.9, 1.2], m: 'sebe' })
  out.push({ p: [17, 0.45, 28], s: [12, 0.9, 1.2], m: 'sebe' })
  // chão, com um furo sob a torre da escada (as cópias de baixo não podem ser cortadas)
  const y = -0.36
  const furo = { x0: ESCADA.x0 - T, x1: ESCADA.x1 + T, z0: ESCADA.z0 - T, z1: ESCADA.z1 + T }
  const R = 160
  const faixa = (x0: number, x1: number, z0: number, z1: number) =>
    out.push({ p: [(x0 + x1) / 2, y, (z0 + z1) / 2], s: [x1 - x0, 0.04, z1 - z0], m: 'cascalho', colide: false, sombra: false })
  faixa(-R, R, -R, furo.z0)
  faixa(-R, R, furo.z1, R)
  faixa(-R, furo.x0, furo.z0, furo.z1)
  faixa(furo.x1, R, furo.z0, furo.z1)
  return out
}

/** um módulo da escada (um andar), deslocado em y */
export function moduloEscada(y0: number): Caixa[] {
  const E = ESCADA
  const out: Caixa[] = []
  const H = E.H
  const parede: ChaveMat = 'forma'
  const real = y0 === 0
  out.push({ p: [E.x0 - T / 2, y0 + H / 2, 0], s: [T, H, E.z1 - E.z0 + T * 2], m: parede, colide: real })
  out.push({ p: [(E.x0 + E.x1) / 2, y0 + H / 2, E.z0 - T / 2], s: [E.x1 - E.x0 + T * 2, H, T], m: parede, colide: real })
  out.push({ p: [(E.x0 + E.x1) / 2, y0 + H / 2, E.z1 + T / 2], s: [E.x1 - E.x0 + T * 2, H, T], m: parede, colide: real })
  // parede leste com a porta (1,5 m para cada lado do eixo)
  const lx = E.x1 + T / 2
  out.push({ p: [lx, y0 + H / 2, (E.z0 - 1.5) / 2], s: [T, H, -1.5 - E.z0], m: parede, colide: real })
  out.push({ p: [lx, y0 + H / 2, (E.z1 + 1.5) / 2], s: [T, H, E.z1 - 1.5], m: parede, colide: real })
  out.push({ p: [lx, y0 + 3 + (H - 3) / 2, 0], s: [T, H - 3, 3], m: parede, colide: false })
  out.push({ p: [lx, y0 - 0.15, 0], s: [T, 0.3, 3], m: 'granilite', colide: false })
  // lajes: patamar do andar + faixa leste, e patamar do meio
  out.push({ p: [(E.x0 + E.faixaX0) / 2, y0 - 0.15, (E.zBase + E.z1) / 2], s: [E.faixaX0 - E.x0, 0.3, E.z1 - E.zBase], m: 'granilite', colide: false })
  out.push({ p: [(E.faixaX0 + E.x1) / 2, y0 - 0.15, 0], s: [E.x1 - E.faixaX0, 0.3, E.z1 - E.z0], m: 'granilite', colide: false })
  out.push({ p: [(E.x0 + E.faixaX0) / 2, y0 + H / 2 - 0.15, (E.patamarZ0 + E.zTopo) / 2], s: [E.faixaX0 - E.x0, 0.3, E.zTopo - E.patamarZ0], m: 'granilite', colide: false })
  // degraus maciços: 12 por lance (espelho de 17,5 cm, piso de 30 cm)
  const n = 12
  const espelho = H / 2 / n
  const piso = (E.zBase - E.zTopo) / n
  for (let i = 0; i < n; i++) {
    const topoA = y0 + (i + 1) * espelho
    const zA = E.zBase - (i + 0.5) * piso
    out.push({ p: [(E.a.x0 + E.a.x1) / 2 - 0.2, topoA - 0.3, zA], s: [E.a.x1 - E.a.x0 + 0.4, 0.6, piso + 0.002], m: 'granilite', colide: false })
    const topoB = y0 + H / 2 + (i + 1) * espelho
    const zB = E.zTopo + (i + 0.5) * piso
    out.push({ p: [(E.b.x0 + E.b.x1) / 2, topoB - 0.3, zB], s: [E.b.x1 - E.b.x0, 0.6, piso + 0.002], m: 'granilite', colide: false })
  }
  // guarda-corpos de vidro com corrimão de aço
  const ang = Math.atan2(H / 2, E.zBase - E.zTopo)
  const comp = Math.hypot(H / 2, E.zBase - E.zTopo)
  const meioZ = (E.zBase + E.zTopo) / 2
  const inclinado = (x: number, yMeio: number, sobeParaNorte: boolean) => {
    const rx = sobeParaNorte ? ang : -ang
    out.push({ p: [x, yMeio + 0.5, meioZ], s: [0.02, 1.0, comp], m: 'vidro', rx, colide: false, sombra: false })
    out.push({ p: [x, yMeio + 1.04, meioZ], s: [0.05, 0.05, comp], m: 'aco', rx, colide: false })
  }
  inclinado(E.a.x1, y0 + H / 4, true)
  inclinado(E.b.x0, y0 + H / 2 + H / 4, false)
  inclinado(E.b.x1, y0 + H / 2 + H / 4, false)
  const reto = (x0: number, x1: number, z0: number, z1: number, y: number) => {
    out.push({ p: [(x0 + x1) / 2, y + 0.5, (z0 + z1) / 2], s: [Math.max(0.02, x1 - x0), 1.0, Math.max(0.02, z1 - z0)], m: 'vidro', colide: false, sombra: false })
    out.push({ p: [(x0 + x1) / 2, y + 1.04, (z0 + z1) / 2], s: [Math.max(0.05, x1 - x0), 0.05, Math.max(0.05, z1 - z0)], m: 'aco', colide: false })
  }
  reto(E.a.x1, E.b.x0, E.zTopo, E.zTopo, y0 + H / 2)
  reto(E.a.x1, E.b.x0, E.zBase, E.zBase, y0)
  reto(E.faixaX0, E.faixaX0, E.patamarZ0, E.zTopo, y0 + H / 2)
  reto(E.faixaX0, E.faixaX0, E.patamarZ0, E.zTopo, y0)
  // janela estreita de vidro fosco na parede oeste, na altura do patamar do meio
  out.push({ p: [E.x0 + 0.02, y0 + H / 2 + 1.5, -3.2], s: [0.02, 2.4, 0.42], m: 'luz', colide: false })
  // rasgo de luz no teto do patamar
  out.push({ p: [(E.x0 + E.faixaX0) / 2, y0 + H - 0.32, 3.8], s: [5.2, 0.02, 0.16], m: 'luz', colide: false })
  return out
}

/** número pintado na parede de cada andar */
function texturaNivel(nivel: number) {
  const rotulo = nivel >= 1 ? String(nivel) : `B${1 - nivel}`
  return canvasTexto(
    512,
    512,
    (g, w, h) => {
      g.clearRect(0, 0, w, h)
      g.fillStyle = '#2a2927'
      g.font = `700 ${rotulo.length > 2 ? 250 : 380}px ${FONTE_SANS}`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(rotulo, w / 2, h / 2 + 24)
    },
    1,
  )
}

export interface Escada {
  grupo: THREE.Group
  nivel: number
  atualizar: (nivel: number) => void
  /** o gravador fica no patamar do quarto andar */
  gravador: THREE.Object3D
}

export const NIVEL_GRAVADOR = 4
const K = 3

/** a escada infinita: um módulo de verdade e cópias acima e abaixo, cada uma com o seu número */
function criarEscada(mats: Materiais): Escada {
  const grupo = new THREE.Group()
  grupo.name = 'escada'
  const numeros: THREE.MeshStandardMaterial[] = []
  const portas: THREE.Mesh[] = []
  const geoPorta = new THREE.BoxGeometry(0.07, 2.96, 2.96)
  const matPorta = new THREE.MeshStandardMaterial({ color: '#5d5e60', metalness: 0.6, roughness: 0.45 })
  for (let k = -K; k <= K; k++) {
    const y0 = k * ESCADA.H
    grupo.add(montar(moduloEscada(y0), mats))
    const m = new THREE.MeshStandardMaterial({ map: texturaNivel(1 + k), transparent: true, roughness: 0.9 })
    numeros.push(m)
    const num = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), m)
    num.position.set(-40.6, y0 + 2.35, ESCADA.z1 - 0.012)
    num.rotation.y = Math.PI
    grupo.add(num)
    const porta = new THREE.Mesh(geoPorta, matPorta)
    porta.position.set(ESCADA.x1 + 0.14, y0 + 1.48, 0)
    porta.castShadow = porta.receiveShadow = true
    porta.userData.k = k
    portas.push(porta)
    grupo.add(porta)
  }
  // tampas de cima e de baixo, perdidas na névoa
  grupo.add(
    montar(
      [
        { p: [(ESCADA.x0 + ESCADA.x1) / 2, (K + 1) * ESCADA.H + 0.2, 0], s: [11, 0.4, 11.2], m: 'escuro' },
        { p: [(ESCADA.x0 + ESCADA.x1) / 2, -K * ESCADA.H - 2.6, 0], s: [11, 0.4, 11.2], m: 'escuro' },
      ],
      mats,
    ),
  )
  // o gravador de fita, no patamar do meio
  const gravador = new THREE.Group()
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.18), new THREE.MeshStandardMaterial({ color: '#2b2a28', roughness: 0.5, metalness: 0.2 }))
  corpo.position.y = 0.045
  const janela = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.004, 0.07), new THREE.MeshStandardMaterial({ color: '#6b5d4a', roughness: 0.3 }))
  janela.position.set(-0.05, 0.091, 0)
  const tecla = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.03), mats.acoClaro)
  tecla.position.set(0.09, 0.095, -0.04)
  gravador.add(corpo, janela, tecla)
  gravador.rotation.y = 0.5
  gravador.traverse((o) => (o.castShadow = true))
  grupo.add(gravador)

  const escada: Escada = {
    grupo,
    nivel: -999,
    gravador,
    atualizar: (nivel: number) => {
      if (nivel === escada.nivel) return
      escada.nivel = nivel
      numeros.forEach((m, i) => {
        m.map?.dispose()
        m.map = texturaNivel(nivel + (i - K))
        m.needsUpdate = true
      })
      // só o térreo de verdade tem a porta aberta para a Galeria 01
      portas.forEach((p) => {
        const k = p.userData.k as number
        p.visible = !(k === 0 && nivel === 1)
      })
      const dk = NIVEL_GRAVADOR - nivel
      gravador.visible = Math.abs(dk) <= K
      gravador.position.set(-43.2, dk * ESCADA.H + ESCADA.H / 2, -4.6)
    },
  }
  escada.atualizar(1)
  return escada
}

/** a casca da Sala (004): paredes finas, teto, a janela e o vão da porta */
function cascaSala004(): Caixa[] {
  const S = SALA004
  const t = 0.18
  const out: Caixa[] = []
  const h = S.h
  const m: ChaveMat = 'gesso'
  // norte e sul vão até a parede da galeria: o vão atrás da janela fica fechado
  const xo = -8
  out.push({ p: [(xo + S.x1 + t) / 2, h / 2, S.z0 - t / 2], s: [S.x1 + t - xo, h, t], m })
  out.push({ p: [(xo + S.x1 + t) / 2, h / 2, S.z1 + t / 2], s: [S.x1 + t - xo, h, t], m })
  // oeste: janela de 1,4 × 1,5 no meio
  const zc = (S.z0 + S.z1) / 2
  out.push({ p: [S.x0 - t / 2, h / 2, (S.z0 + zc - 0.7) / 2], s: [t, h, zc - 0.7 - S.z0], m })
  out.push({ p: [S.x0 - t / 2, h / 2, (zc + 0.7 + S.z1) / 2], s: [t, h, S.z1 - zc - 0.7], m })
  out.push({ p: [S.x0 - t / 2, 0.45, zc], s: [t, 0.9, 1.4], m })
  out.push({ p: [S.x0 - t / 2, (2.4 + h) / 2, zc], s: [t, h - 2.4, 1.4], m, colide: false })
  // leste: o vão da porta
  out.push({ p: [S.x1 + t / 2, h / 2, (S.z0 + S.porta.z0) / 2], s: [t, h, S.porta.z0 - S.z0], m })
  out.push({ p: [S.x1 + t / 2, h / 2, (S.porta.z1 + S.z1) / 2], s: [t, h, S.z1 - S.porta.z1], m })
  out.push({ p: [S.x1 + t / 2, (2.2 + h) / 2, (S.porta.z0 + S.porta.z1) / 2], s: [t, h - 2.2, S.porta.z1 - S.porta.z0], m, colide: false })
  out.push({ p: [(xo + S.x1 + t) / 2, h + 0.08, (S.z0 + S.z1) / 2], s: [S.x1 + t - xo, 0.16, S.z1 - S.z0 + t * 2], m: 'teto', colide: false })
  // piso de tábuas mais escuras, rodapé
  out.push({ p: [(S.x0 + S.x1) / 2, 0.012, (S.z0 + S.z1) / 2], s: [S.x1 - S.x0, 0.024, S.z1 - S.z0], m: 'nogueira', colide: false })
  // atrás da janela, um pátio de luz (um plano luminoso a meio metro)
  out.push({ p: [S.x0 - 0.75, 1.65, zc], s: [0.04, 1.7, 1.7], m: 'luz', colide: false })
  out.push({ p: [S.x0 - 0.4, 1.65, zc - 0.85], s: [0.7, 1.7, 0.04], m: 'gesso', colide: false })
  out.push({ p: [S.x0 - 0.4, 1.65, zc + 0.85], s: [0.7, 1.7, 0.04], m: 'gesso', colide: false })
  // caixilho em cruz
  out.push({ p: [S.x0 - t / 2, 1.65, zc], s: [0.04, 0.04, 1.4], m: 'nogueira', colide: false })
  out.push({ p: [S.x0 - t / 2, 1.65, zc], s: [0.04, 1.5, 0.04], m: 'nogueira', colide: false })
  return out
}

/** móveis e peças que não são anômalas (o museu precisa parecer um museu) */
function mobiliario(): Record<string, Caixa[]> {
  const g01: Caixa[] = []
  for (let i = 0; i < 9; i++) g01.push({ p: [-18.5, 0.04 + i * 0.075, 3.2], s: [1.6 - i * 0.04, 0.06, 1.0 - i * 0.03], m: 'aco', ry: i * 0.035 })
  const g02: Caixa[] = []
  // vitrine com base de carvalho e caixa de vidro
  g02.push({ p: [3.5, 0.45, -16.2], s: [2.2, 0.9, 0.9], m: 'madeira' })
  g02.push({ p: [3.5, 1.3, -16.2], s: [2.2, 0.8, 0.9], m: 'vidro', colide: false, sombra: false })
  // mesa de leitura
  g02.push({ p: [4, 0.74, -29.6], s: [2.2, 0.05, 1.0], m: 'nogueira', colide: false })
  for (const [x, z] of [
    [3.0, -29.2],
    [5.0, -29.2],
    [3.0, -30.0],
    [5.0, -30.0],
  ])
    g02.push({ p: [x, 0.36, z], s: [0.045, 0.72, 0.045], m: 'aco', colide: false })
  const g03: Caixa[] = []
  g03.push({ p: [24.6, 0.22, 0], s: [0.62, 0.44, 2.6], m: 'travertino' })
  g03.push({ p: [29.6, 0.55, -5.6], s: [0.46, 1.1, 0.36], m: 'aco' })
  const g04: Caixa[] = []
  g04.push({ p: [24, 0.22, -18.4], s: [2.6, 0.44, 0.62], m: 'travertino' })
  const g05: Caixa[] = []
  g05.push({ p: [-15, 0.55, -29.8], s: [0.6, 1.1, 0.6], m: 'pedestal' })
  const servico: Caixa[] = []
  for (let i = 0; i < 4; i++) {
    const x = -21 + i * 3.4
    const z = -38.42
    for (const dx of [-1.35, 1.35]) for (const dz of [-0.24, 0.24]) servico.push({ p: [x + dx, 1.0, z + dz], s: [0.04, 2.0, 0.04], m: 'acoClaro', colide: false })
    for (const y of [0.12, 0.7, 1.28, 1.86]) servico.push({ p: [x, y, z], s: [2.74, 0.03, 0.52], m: 'acoClaro', colide: false })
    // caixas de arquivo nas prateleiras
    for (const y of [0.135, 0.715, 1.295]) {
      let cx = x - 1.25
      let k = 0
      while (cx < x + 1.1) {
        const w = 0.32 + ((i * 7 + k * 3 + Math.round(y * 10)) % 3) * 0.06
        if ((i + k + Math.round(y * 10)) % 5 !== 0) servico.push({ p: [cx + w / 2, y + 0.15, z], s: [w - 0.02, 0.3, 0.4], m: 'papelao', colide: false })
        cx += w
        k++
      }
    }
    servico.push({ p: [x, 1.0, z], s: [2.8, 2.0, 0.56], m: null, colide: true })
  }
  return { g01, g02, g03, g04, g05, servico }
}

/** enquanto o corredor de serviço não existe, a parede da Galeria 05 é inteira */
const tampaServico = (): Caixa[] => [{ p: [-22, 1.3, -33.2], s: [2, 2.6, 0.4], m: 'gesso' }]

export interface Mundo {
  grupo: THREE.Group
  salas: Record<string, THREE.Group>
  blocos: Bloco[]
  escada: Escada
  servico: { tampa: THREE.Object3D; espacos: THREE.Group; revelado: boolean }
  /** malhas que o cursor testa (paredes e pisos) */
  solidos: THREE.Object3D[]
  /** a porta do hall da escada nos andares que não são o térreo */
  blocoPortaEscada: Bloco
}

export function construirMundo(mats: Materiais): Mundo {
  const grupo = new THREE.Group()
  const salas: Record<string, THREE.Group> = {}
  const blocos: Bloco[] = []
  const solidos: THREE.Object3D[] = []
  const servicoGrupo = new THREE.Group()
  const mob = mobiliario()

  const paraBloco = (c: Caixa, ativo?: () => boolean) => {
    if (c.colide === false || (!c.m && c.colide !== true)) return
    const ry = c.ry ?? 0
    const cos = Math.abs(Math.cos(ry))
    const sin = Math.abs(Math.sin(ry))
    const hx = (c.s[0] * cos + c.s[2] * sin) / 2
    const hz = (c.s[0] * sin + c.s[2] * cos) / 2
    blocos.push({ x0: c.p[0] - hx, x1: c.p[0] + hx, z0: c.p[2] - hz, z1: c.p[2] + hz, ativo, baixo: c.p[1] + c.s[1] / 2 < 1.4 })
  }

  const servicoVisivel = () => servicoGrupo.visible
  for (const e of ESPACOS) {
    if (e.id === 'escada') continue
    const caixas = [...paredesDe(e), ...pisoTeto(e), ...rasgos(e)]
    if (e.id === 'atrio') caixas.push(...atrio())
    if (e.id === 'g02') caixas.push(...cascaSala004())
    if (mob[e.id]) caixas.push(...mob[e.id])
    const g = montar(caixas, mats)
    g.name = e.id
    salas[e.id] = g
    const oculto = e.oculto && !e.longe
    if (oculto) servicoGrupo.add(g)
    else grupo.add(g)
    solidos.push(g)
    caixas.forEach((c) => paraBloco(c, oculto ? servicoVisivel : undefined))
  }
  grupo.add(servicoGrupo)
  servicoGrupo.visible = false

  const ext = exterior()
  const gExt = montar(ext, mats)
  gExt.name = 'exterior'
  // o chão de fora recebe sombra mas não projeta
  grupo.add(gExt)
  solidos.push(gExt)
  ext.forEach((c) => paraBloco(c))

  const tampa = montar(tampaServico(), mats)
  grupo.add(tampa)
  solidos.push(tampa)
  tampaServico().forEach((c) => paraBloco(c, () => tampa.visible))

  // a mesa de leitura e a estante colidem (as caixas delas não colidem sozinhas)
  blocos.push({ x0: 2.9, x1: 5.1, z0: -30.1, z1: -29.1, baixo: true })
  blocos.push({ x0: 1.4, x1: 6.6, z0: -33, z1: -32.55 })

  const escada = criarEscada(mats)
  grupo.add(escada.grupo)
  solidos.push(escada.grupo)
  moduloEscada(0).forEach((c) => paraBloco(c))
  // guarda-corpos da escada (valem em todos os andares)
  blocos.push({ x0: ESCADA.a.x1 - 0.03, x1: ESCADA.a.x1 + 0.03, z0: ESCADA.zTopo, z1: ESCADA.zBase, baixo: true })
  blocos.push({ x0: ESCADA.b.x0 - 0.03, x1: ESCADA.b.x0 + 0.03, z0: ESCADA.zTopo, z1: ESCADA.zBase, baixo: true })
  blocos.push({ x0: ESCADA.faixaX0 - 0.03, x1: ESCADA.faixaX0 + 0.03, z0: ESCADA.z0, z1: ESCADA.zBase, baixo: true })
  // a porta do andar, quando o andar não é o térreo
  const blocoPortaEscada: Bloco = { x0: ESCADA.x1 - 0.1, x1: ESCADA.x1 + 0.4, z0: -1.5, z1: 1.5, ativo: () => escada.nivel !== 1 }
  blocos.push(blocoPortaEscada)

  return { grupo, salas, blocos, escada, servico: { tampa, espacos: servicoGrupo, revelado: false }, solidos, blocoPortaEscada }
}

// ——— letreiros e placas (texto em canvas, refeitos quando o idioma muda)

export function quebrar(g: CanvasRenderingContext2D, texto: string, max: number) {
  const linhas: string[] = []
  for (const paragrafo of texto.split('\n')) {
    const palavras = paragrafo.split(' ')
    let atual = ''
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p
      if (g.measureText(teste).width > max && atual) {
        linhas.push(atual)
        atual = p
      } else atual = teste
    }
    linhas.push(atual)
  }
  return linhas
}

export interface Letreiro {
  malha: THREE.Mesh
  redesenhar: () => void
}

/** um plano com texto em canvas; `desenho` é chamado de novo quando o idioma muda */
export function letreiro(
  largura: number,
  altura: number,
  desenho: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  { resolucao = 420, transparente = true, brilho = false }: { resolucao?: number; transparente?: boolean; brilho?: boolean } = {},
): Letreiro {
  const fazer = () => canvasTexto(largura * resolucao, altura * resolucao, desenho, 1.5)
  const mat = brilho
    ? new THREE.MeshBasicMaterial({ map: fazer(), transparent: transparente, toneMapped: true })
    : new THREE.MeshStandardMaterial({ map: fazer(), transparent: transparente, roughness: 0.82, metalness: 0 })
  const malha = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), mat)
  malha.receiveShadow = !brilho
  return {
    malha,
    redesenhar: () => {
      mat.map?.dispose()
      mat.map = fazer()
      mat.needsUpdate = true
    },
  }
}

/** placa de parede de uma obra: número, título e linhas pequenas */
export function desenharPlaca(numero: () => string, titulo: () => string, linhas: () => string[], { escura = false, espelhada = false } = {}) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    if (espelhada) {
      g.translate(w, 0)
      g.scale(-1, 1)
    }
    g.fillStyle = escura ? '#1c1c1b' : '#f4f2ed'
    g.fillRect(0, 0, w, h)
    const pad = w * 0.075
    g.fillStyle = '#b8432f'
    g.font = `500 ${h * 0.075}px ${FONTE_SANS}`
    g.textBaseline = 'top'
    g.fillText(numero(), pad, pad)
    g.fillStyle = escura ? '#eeeae2' : '#151515'
    g.font = `400 ${h * 0.16}px ${FONTE_SERIF}`
    let y = pad + h * 0.12
    for (const parte of quebrar(g, titulo(), w - pad * 2)) {
      g.fillText(parte, pad, y)
      y += h * 0.165
    }
    g.fillStyle = escura ? '#a9a49b' : '#55524c'
    g.font = `400 ${h * 0.062}px ${FONTE_SANS}`
    y += h * 0.035
    for (const l of linhas()) {
      for (const parte of quebrar(g, l, w - pad * 2)) {
        g.fillText(parte, pad, y)
        y += h * 0.085
      }
    }
  }
}

// ——— altura do piso

/** altura do piso do hall da escada, no módulo (0 a H) — NaN no poço */
function alturaModulo(x: number, z: number) {
  const E = ESCADA
  if (x >= E.faixaX0) return 0
  if (z >= E.zBase) return 0
  if (z <= E.zTopo) return E.H / 2
  if (x <= E.a.x1) return ((E.zBase - z) / (E.zBase - E.zTopo)) * (E.H / 2)
  if (x >= E.b.x0) return E.H / 2 + ((z - E.zTopo) / (E.zBase - E.zTopo)) * (E.H / 2)
  return Number.NaN
}

export const noHallEscada = (x: number, z: number) => x > ESCADA.x0 - 0.3 && x < ESCADA.x1 + 0.05 && z > ESCADA.z0 - 0.3 && z < ESCADA.z1 + 0.3

/**
 * altura do piso em (x, z); na escada escolhe, entre os andares possíveis, o mais próximo de y.
 * NaN = não dá para pisar ali.
 */
export function alturaPiso(x: number, z: number, y: number) {
  if (noHallEscada(x, z)) {
    const h = alturaModulo(x, z)
    if (Number.isNaN(h)) return h
    const k = Math.round((y - h) / ESCADA.H)
    return h + k * ESCADA.H
  }
  return 0
}
