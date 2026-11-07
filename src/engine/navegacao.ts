// Como o visitante anda: colisão contra os blocos da planta, altura do piso, caminhos pela
// grade (A*), suavização por linha de visada e o caminho em espiral da escada.
import { alturaPiso, noHallEscada, type Bloco } from './mundo'
import { ESCADA, ESPACOS } from './planta'

export const RAIO = 0.28
/** maior diferença de altura que se vence num passo (rampas da escada sim, beiradas não) */
export const PASSO = 0.35

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const blocoAtivo = (b: Bloco) => !b.ativo || b.ativo()

/** empurra o círculo para fora dos blocos */
export function resolver(x: number, z: number, blocos: Bloco[], raio = RAIO): [number, number] {
  for (let it = 0; it < 4; it++) {
    let mexeu = false
    for (const b of blocos) {
      if (x + raio <= b.x0 || x - raio >= b.x1 || z + raio <= b.z0 || z - raio >= b.z1) continue
      if (!blocoAtivo(b)) continue
      const cx = clamp(x, b.x0, b.x1)
      const cz = clamp(z, b.z0, b.z1)
      const dx = x - cx
      const dz = z - cz
      const d2 = dx * dx + dz * dz
      if (d2 >= raio * raio) continue
      if (d2 < 1e-12) {
        const l = x - b.x0
        const r = b.x1 - x
        const f = z - b.z0
        const t = b.z1 - z
        const m = Math.min(l, r, f, t)
        if (m === l) x = b.x0 - raio
        else if (m === r) x = b.x1 + raio
        else if (m === f) z = b.z0 - raio
        else z = b.z1 + raio
      } else {
        const d = Math.sqrt(d2)
        x = cx + (dx / d) * raio
        z = cz + (dz / d) * raio
      }
      mexeu = true
    }
    if (!mexeu) break
  }
  return [x, z]
}

export interface Pos {
  x: number
  y: number
  z: number
}

/** tenta mover; desliza nas paredes; devolve a distância realmente andada */
export function mover(p: Pos, dx: number, dz: number, blocos: Bloco[]) {
  const tentar = (nx: number, nz: number) => {
    const [rx, rz] = resolver(nx, nz, blocos)
    const h = alturaPiso(rx, rz, p.y)
    if (Number.isNaN(h) || Math.abs(h - p.y) > PASSO) return false
    const andou = Math.hypot(rx - p.x, rz - p.z)
    p.x = rx
    p.z = rz
    p.y = h
    return andou
  }
  const r = tentar(p.x + dx, p.z + dz)
  if (r !== false) return r
  const rx = tentar(p.x + dx, p.z)
  if (rx !== false && rx > 1e-4) return rx
  const rz = tentar(p.x, p.z + dz)
  if (rz !== false) return rz
  return 0
}

/** o segmento a→b (no plano) cruza algum bloco ativo? */
export function livre2D(ax: number, az: number, bx: number, bz: number, blocos: Bloco[], margem = 0, soAltos = false) {
  const dx = bx - ax
  const dz = bz - az
  for (const b of blocos) {
    if (soAltos && b.baixo) continue
    if (!blocoAtivo(b)) continue
    let t0 = 0
    let t1 = 1
    const x0 = b.x0 - margem
    const x1 = b.x1 + margem
    const z0 = b.z0 - margem
    const z1 = b.z1 + margem
    if (Math.abs(dx) < 1e-9) {
      if (ax < x0 || ax > x1) continue
    } else {
      let ta = (x0 - ax) / dx
      let tb = (x1 - ax) / dx
      if (ta > tb) [ta, tb] = [tb, ta]
      t0 = Math.max(t0, ta)
      t1 = Math.min(t1, tb)
      if (t0 > t1) continue
    }
    if (Math.abs(dz) < 1e-9) {
      if (az < z0 || az > z1) continue
    } else {
      let ta = (z0 - az) / dz
      let tb = (z1 - az) / dz
      if (ta > tb) [ta, tb] = [tb, ta]
      t0 = Math.max(t0, ta)
      t1 = Math.min(t1, tb)
      if (t0 > t1) continue
    }
    return false
  }
  return true
}

// ——— grade de navegação

const PRACA = [
  { x0: -24, x1: 24, z0: 11.4, z1: 33.6 },
  { x0: -24, x1: -11.4, z0: 8.4, z1: 11.4 },
  { x0: 11.4, x1: 16.3, z0: 8.4, z1: 11.4 },
]

/** há piso (no térreo) neste ponto? */
function chao(x: number, z: number) {
  if (noHallEscada(x, z)) {
    // no hall da escada, só o patamar do andar e a faixa leste
    if (x >= ESCADA.faixaX0) return x < ESCADA.x1 + 0.05 && z > ESCADA.z0 && z < ESCADA.z1
    return z > ESCADA.zBase + 0.05 && z < ESCADA.z1 && x > ESCADA.x0
  }
  for (const e of ESPACOS) {
    if (x >= e.x0 - 0.45 && x <= e.x1 + 0.45 && z >= e.z0 - 0.45 && z <= e.z1 + 0.45) return true
  }
  for (const r of PRACA) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true
  return false
}

class Heap {
  private a: number[] = []
  private f: Float32Array
  constructor(f: Float32Array) {
    this.f = f
  }
  get tamanho() {
    return this.a.length
  }
  push(i: number) {
    const a = this.a
    a.push(i)
    let k = a.length - 1
    while (k > 0) {
      const p = (k - 1) >> 1
      if (this.f[a[p]] <= this.f[a[k]]) break
      ;[a[p], a[k]] = [a[k], a[p]]
      k = p
    }
  }
  pop() {
    const a = this.a
    const topo = a[0]
    const ult = a.pop()!
    if (a.length) {
      a[0] = ult
      let k = 0
      for (;;) {
        const l = k * 2 + 1
        const r = l + 1
        let m = k
        if (l < a.length && this.f[a[l]] < this.f[a[m]]) m = l
        if (r < a.length && this.f[a[r]] < this.f[a[m]]) m = r
        if (m === k) break
        ;[a[m], a[k]] = [a[k], a[m]]
        k = m
      }
    }
    return topo
  }
}

export class Grade {
  readonly x0: number
  readonly z0: number
  readonly res: number
  readonly nx: number
  readonly nz: number
  private estatico: Uint8Array
  private dinamicos: Bloco[]

  constructor(x0: number, z0: number, x1: number, z1: number, res: number, blocos: Bloco[]) {
    this.x0 = x0
    this.z0 = z0
    this.res = res
    this.nx = Math.ceil((x1 - x0) / res)
    this.nz = Math.ceil((z1 - z0) / res)
    const n = this.nx * this.nz
    this.estatico = new Uint8Array(n)
    for (let j = 0; j < this.nz; j++)
      for (let i = 0; i < this.nx; i++) {
        const x = x0 + (i + 0.5) * res
        const z = z0 + (j + 0.5) * res
        this.estatico[j * this.nx + i] = chao(x, z) ? 1 : 0
      }
    this.dinamicos = blocos.filter((b) => b.ativo)
    for (const b of blocos) if (!b.ativo) this.pintar(this.estatico, b, 0)
  }

  dentro(x: number, z: number) {
    return x >= this.x0 && z >= this.z0 && x < this.x0 + this.nx * this.res && z < this.z0 + this.nz * this.res
  }

  private pintar(m: Uint8Array, b: Bloco, v: number) {
    const r = RAIO + 0.02
    const i0 = Math.max(0, Math.floor((b.x0 - r - this.x0) / this.res))
    const i1 = Math.min(this.nx - 1, Math.floor((b.x1 + r - this.x0) / this.res))
    const j0 = Math.max(0, Math.floor((b.z0 - r - this.z0) / this.res))
    const j1 = Math.min(this.nz - 1, Math.floor((b.z1 + r - this.z0) / this.res))
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const x = this.x0 + (i + 0.5) * this.res
        const z = this.z0 + (j + 0.5) * this.res
        const dx = Math.max(b.x0 - x, 0, x - b.x1)
        const dz = Math.max(b.z0 - z, 0, z - b.z1)
        if (dx * dx + dz * dz < r * r) m[j * this.nx + i] = v
      }
  }

  private mapaAtual(ignorar?: Bloco[]) {
    const m = this.estatico.slice()
    for (const b of this.dinamicos) if (blocoAtivo(b) && !ignorar?.includes(b)) this.pintar(m, b, 0)
    return m
  }

  private celula(x: number, z: number) {
    return [clamp(Math.floor((x - this.x0) / this.res), 0, this.nx - 1), clamp(Math.floor((z - this.z0) / this.res), 0, this.nz - 1)] as const
  }

  /** a célula livre mais próxima (até ~1,5 m) */
  private livreMaisProxima(m: Uint8Array, i: number, j: number) {
    if (m[j * this.nx + i]) return [i, j] as const
    for (let r = 1; r < 7; r++)
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue
          const a = i + di
          const b = j + dj
          if (a < 0 || b < 0 || a >= this.nx || b >= this.nz) continue
          if (m[b * this.nx + a]) return [a, b] as const
        }
    return null
  }

  private visada(m: Uint8Array, ax: number, az: number, bx: number, bz: number) {
    const d = Math.hypot(bx - ax, bz - az)
    const n = Math.ceil(d / (this.res * 0.5))
    for (let k = 0; k <= n; k++) {
      const t = k / Math.max(1, n)
      const [i, j] = this.celula(ax + (bx - ax) * t, az + (bz - az) * t)
      if (!m[j * this.nx + i]) return false
    }
    return true
  }

  /** caminho de a até b (lista de pontos no plano), ou null */
  caminho(ax: number, az: number, bx: number, bz: number, ignorar?: Bloco[]): [number, number][] | null {
    const m = this.mapaAtual(ignorar)
    const [ci, cj] = this.celula(ax, az)
    const ini = this.livreMaisProxima(m, ci, cj)
    const [di, dj] = this.celula(bx, bz)
    const fim = this.livreMaisProxima(m, di, dj)
    if (!ini || !fim) return null
    const nx = this.nx
    const n = nx * this.nz
    const g = new Float32Array(n).fill(Infinity)
    const f = new Float32Array(n).fill(Infinity)
    const de = new Int32Array(n).fill(-1)
    const fechado = new Uint8Array(n)
    const s = ini[1] * nx + ini[0]
    const alvo = fim[1] * nx + fim[0]
    const h = (k: number) => {
      const i = k % nx
      const j = (k / nx) | 0
      const dx = Math.abs(i - fim[0])
      const dz = Math.abs(j - fim[1])
      return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz)
    }
    g[s] = 0
    f[s] = h(s)
    const heap = new Heap(f)
    heap.push(s)
    const viz = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, 1.4142],
      [1, -1, 1.4142],
      [-1, 1, 1.4142],
      [-1, -1, 1.4142],
    ]
    let achou = false
    let passos = 0
    while (heap.tamanho && passos++ < 200000) {
      const k = heap.pop()
      if (fechado[k]) continue
      if (k === alvo) {
        achou = true
        break
      }
      fechado[k] = 1
      const i = k % nx
      const j = (k / nx) | 0
      for (const [di2, dj2, c] of viz) {
        const a = i + di2
        const b = j + dj2
        if (a < 0 || b < 0 || a >= nx || b >= this.nz) continue
        const q = b * nx + a
        if (!m[q] || fechado[q]) continue
        // diagonal sem cortar quina
        if (di2 && dj2 && (!m[j * nx + a] || !m[b * nx + i])) continue
        const ng = g[k] + c
        if (ng < g[q]) {
          g[q] = ng
          f[q] = ng + h(q)
          de[q] = k
          heap.push(q)
        }
      }
    }
    if (!achou) return null
    const bruto: [number, number][] = []
    for (let k = alvo; k !== -1; k = de[k]) {
      const i = k % nx
      const j = (k / nx) | 0
      bruto.push([this.x0 + (i + 0.5) * this.res, this.z0 + (j + 0.5) * this.res])
    }
    bruto.reverse()
    bruto[0] = [ax, az]
    if (m[this.celula(bx, bz)[1] * nx + this.celula(bx, bz)[0]]) bruto[bruto.length - 1] = [bx, bz]
    // suaviza: pula pontos enquanto houver linha de visada
    const out: [number, number][] = [bruto[0]]
    let i = 0
    while (i < bruto.length - 1) {
      let j = bruto.length - 1
      while (j > i + 1 && !this.visada(m, bruto[i][0], bruto[i][1], bruto[j][0], bruto[j][1])) j--
      out.push(bruto[j])
      i = j
    }
    return out
  }
}

// ——— a espiral da escada

const H = ESCADA.H
/** caminho de um andar: centro do patamar → lance A → patamar do meio → lance B → patamar de cima */
const ESPIRAL: [number, number, number][] = [
  [-40.4, 0, 3.9],
  [-42.4, 0, 2.8],
  [-42.4, H / 2, -1.4],
  [-40.4, H / 2, -3.3],
  [-38.4, H / 2, -1.4],
  [-38.4, H, 2.8],
  [-40.4, H, 3.9],
]
const ACUM = (() => {
  const a = [0]
  for (let i = 1; i < ESPIRAL.length; i++) {
    const [x0, y0, z0] = ESPIRAL[i - 1]
    const [x1, y1, z1] = ESPIRAL[i]
    a.push(a[i - 1] + Math.hypot(x1 - x0, (y1 - y0) * 1.6, z1 - z0))
  }
  return a
})()
const TOTAL = ACUM[ACUM.length - 1]
const CONEXAO_FAIXA: [number, number] = [-36.3, 3.9]

const naFaixa = (x: number) => x > ESCADA.faixaX0 - 0.1

/** posição na espiral (andares, contando do módulo 0) de um ponto do hall */
export function posicaoEspiral(x: number, y: number, z: number) {
  if (naFaixa(x)) return Math.round(y / H)
  let melhor = Infinity
  let s = 0
  const kc = Math.floor(y / H)
  for (let k = kc - 1; k <= kc + 1; k++)
    for (let i = 0; i < ESPIRAL.length - 1; i++) {
      const [x0, y0, z0] = ESPIRAL[i]
      const [x1, y1, z1] = ESPIRAL[i + 1]
      const ya = y0 + k * H
      const yb = y1 + k * H
      const vx = x1 - x0
      const vy = yb - ya
      const vz = z1 - z0
      const L2 = vx * vx + vy * vy + vz * vz
      let t = ((x - x0) * vx + (y - ya) * vy + (z - z0) * vz) / L2
      t = clamp(t, 0, 1)
      const d = Math.hypot(x0 + vx * t - x, ya + vy * t - y, z0 + vz * t - z)
      if (d < melhor) {
        melhor = d
        s = k + (ACUM[i] + (ACUM[i + 1] - ACUM[i]) * t) / TOTAL
      }
    }
  return s
}

/** pontos (no plano) para ir, pela escada, da posição s0 até s1 */
export function caminhoEspiral(de: Pos, ate: Pos | number): [number, number][] {
  const s0 = posicaoEspiral(de.x, de.y, de.z)
  const s1 = typeof ate === 'number' ? ate : posicaoEspiral(ate.x, ate.y, ate.z)
  const out: [number, number][] = [[de.x, de.z]]
  if (naFaixa(de.x)) out.push(CONEXAO_FAIXA)
  const nos: { s: number; p: [number, number] }[] = []
  const kMin = Math.floor(Math.min(s0, s1)) - 1
  const kMax = Math.ceil(Math.max(s0, s1)) + 1
  for (let k = kMin; k <= kMax; k++)
    for (let i = 0; i < ESPIRAL.length - 1; i++) nos.push({ s: k + ACUM[i] / TOTAL, p: [ESPIRAL[i][0], ESPIRAL[i][2]] })
  const sobe = s1 > s0
  const meio = nos.filter((n) => (sobe ? n.s > s0 + 1e-3 && n.s < s1 - 1e-3 : n.s < s0 - 1e-3 && n.s > s1 + 1e-3))
  meio.sort((a, b) => (sobe ? a.s - b.s : b.s - a.s))
  for (const n of meio) out.push(n.p)
  if (typeof ate === 'number') {
    // termina sempre no centro do patamar
    out.push([ESPIRAL[0][0], ESPIRAL[0][2]])
  } else {
    if (naFaixa(ate.x)) out.push(CONEXAO_FAIXA)
    out.push([ate.x, ate.z])
  }
  return out
}

/** dá para ir em linha reta, acompanhando o piso, de a até b? */
export function retaPossivel(a: Pos, bx: number, bz: number, blocos: Bloco[]) {
  if (!livre2D(a.x, a.z, bx, bz, blocos, RAIO * 0.6)) return false
  const d = Math.hypot(bx - a.x, bz - a.z)
  const n = Math.ceil(d / 0.12)
  let y = a.y
  for (let k = 1; k <= n; k++) {
    const t = k / n
    const h = alturaPiso(a.x + (bx - a.x) * t, a.z + (bz - a.z) * t, y)
    if (Number.isNaN(h) || Math.abs(h - y) > PASSO * 0.6) return false
    y = h
  }
  return true
}
