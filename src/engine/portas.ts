// Portas: de correr (vidro da entrada), de giro (madeira, painel de serviço, aço) e fixas.
import * as THREE from 'three'
import type { Bloco } from './mundo'

export type TipoPorta = 'correr' | 'giro' | 'fixa'
export type SomPorta = 'vidro' | 'madeira' | 'aco' | 'painel'

export interface OpcoesPorta {
  id: string
  tipo: TipoPorta
  /** a parede corre ao longo de x (paredes norte/sul) ou de z (leste/oeste) */
  eixo: 'x' | 'z'
  /** centro do vão, no meio da espessura da parede */
  centro: [number, number]
  largura: number
  altura: number
  espessura?: number
  folha: THREE.Material
  quadro?: THREE.Material
  som: SomPorta
  /** abre sozinha quando o visitante chega perto */
  automatica?: number
  aberta?: boolean
  /** giro: lado da dobradiça (-1 = início do vão, 1 = fim) e para que lado a folha abre (+1/-1 na normal) */
  dobradica?: -1 | 1
  abrePara?: -1 | 1
  vidro?: boolean
}

export class Porta {
  readonly id: string
  readonly grupo = new THREE.Group()
  readonly bloco: Bloco
  readonly opcoes: OpcoesPorta
  /** malhas que o cursor pode apontar */
  readonly alvos: THREE.Object3D[] = []
  abertura = 0
  alvo = 0
  trancada = false
  /** a folha (no giro, gira junto com a dobradiça) */
  painel: THREE.Object3D | null = null
  aoMover?: (abrindo: boolean) => void
  private folhas: { obj: THREE.Object3D; base: THREE.Vector3; sentido: number }[] = []

  constructor(o: OpcoesPorta) {
    this.id = o.id
    this.opcoes = o
    const esp = o.espessura ?? 0.06
    const [cx, cz] = o.centro
    const w = o.largura
    const h = o.altura
    this.grupo.position.set(cx, 0, cz)
    if (o.eixo === 'z') this.grupo.rotation.y = Math.PI / 2
    // no espaço local: o vão corre em x, de -w/2 a w/2; a normal é z
    if (o.tipo === 'correr') {
      for (const lado of [-1, 1]) {
        const folha = this.folhaVidro(w / 2, h, o)
        folha.position.set((lado * w) / 4, 0, 0)
        this.grupo.add(folha)
        this.folhas.push({ obj: folha, base: folha.position.clone(), sentido: lado })
      }
    } else {
      const dob = o.dobradica ?? -1
      const pivo = new THREE.Group()
      pivo.position.set((dob * w) / 2, 0, 0)
      const painel = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.01, esp), o.folha)
      painel.position.set((-dob * (w - 0.02)) / 2, (h - 0.01) / 2, 0)
      painel.castShadow = painel.receiveShadow = true
      pivo.add(painel)
      // puxador
      const pux = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.05), o.quadro ?? o.folha)
      pux.position.set(-dob * (w - 0.14), 1.05, (esp / 2 + 0.025) * (o.abrePara ?? 1) * -1)
      pivo.add(pux)
      const pux2 = pux.clone()
      pux2.position.z *= -1
      pivo.add(pux2)
      this.grupo.add(pivo)
      this.folhas.push({ obj: pivo, base: pivo.position.clone(), sentido: dob * (o.abrePara ?? 1) })
      this.alvos.push(painel)
      this.painel = painel
    }
    this.alvos.forEach((a) => (a.userData.porta = this))
    // bloqueio enquanto não estiver aberta
    const meia = w / 2
    const prof = 0.25
    this.bloco =
      o.eixo === 'x'
        ? { x0: cx - meia, x1: cx + meia, z0: cz - prof, z1: cz + prof, ativo: () => this.abertura < 0.8 }
        : { x0: cx - prof, x1: cx + prof, z0: cz - meia, z1: cz + meia, ativo: () => this.abertura < 0.8 }
    if (o.aberta) this.abertura = this.alvo = 1
    this.aplicar()
  }

  private folhaVidro(w: number, h: number, o: OpcoesPorta) {
    const g = new THREE.Group()
    const vidro = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), o.folha)
    vidro.position.y = h / 2
    vidro.renderOrder = 2
    g.add(vidro)
    const q = o.quadro!
    const barra = (bw: number, bh: number, x: number, y: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.05), q)
      m.position.set(x, y, 0)
      m.castShadow = true
      g.add(m)
    }
    barra(w, 0.07, 0, h - 0.035)
    barra(w, 0.12, 0, 0.06)
    barra(0.05, h, -w / 2 + 0.025, h / 2)
    barra(0.05, h, w / 2 - 0.025, h / 2)
    // puxador vertical de aço
    barra(0.03, 1.2, 0, 1.15)
    this.alvos.push(vidro)
    return g
  }

  abrir() {
    if (this.trancada || this.opcoes.tipo === 'fixa') return false
    if (this.alvo !== 1) {
      this.alvo = 1
      this.aoMover?.(true)
    }
    return true
  }

  /** quando foi fechada por último (ms) */
  fechadaEm = -1e9

  fechar() {
    this.fechadaEm = performance.now()
    if (this.alvo !== 0) {
      this.alvo = 0
      this.aoMover?.(false)
    }
  }

  alternar() {
    if (this.alvo > 0.5) this.fechar()
    else return this.abrir()
    return true
  }

  atualizar(dt: number, jx: number, jz: number) {
    const o = this.opcoes
    if (o.automatica && !this.trancada) {
      const d = Math.hypot(jx - o.centro[0], jz - o.centro[1])
      if (d < o.automatica) this.abrir()
      else if (d > o.automatica + 0.6) this.fechar()
    }
    if (this.abertura === this.alvo) return
    const vel = o.tipo === 'correr' ? 1.1 : 0.75
    const passo = dt * vel
    this.abertura = this.abertura < this.alvo ? Math.min(this.alvo, this.abertura + passo) : Math.max(this.alvo, this.abertura - passo)
    this.aplicar()
  }

  private aplicar() {
    const o = this.opcoes
    // curva suave (começa e termina devagar)
    const a = this.abertura
    const e = a * a * (3 - 2 * a)
    for (const f of this.folhas) {
      if (o.tipo === 'correr') f.obj.position.x = f.base.x + f.sentido * e * (o.largura / 2 - 0.08)
      else f.obj.rotation.y = f.sentido * e * 1.62
    }
  }
}
