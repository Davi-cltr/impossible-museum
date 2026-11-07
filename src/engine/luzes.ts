// A luz do museu: sol de fim de tarde pela claraboia, luz do céu, um conjunto fixo de luzes
// pontuais que acompanham o visitante (o número de luzes nunca muda, para o sombreador não
// ser recompilado) e quatro refletores das obras.
import * as THREE from 'three'
import type { Qualidade } from '../core/estado'

export interface Ancora {
  pos: THREE.Vector3
  cor: THREE.Color
  intensidade: number
  alcance: number
  sala: string
  /** multiplicador extra (o vestíbulo escurece na passagem) */
  fator?: () => number
}

const a = (x: number, y: number, z: number, cor: string, intensidade: number, alcance: number, sala: string, fator?: () => number): Ancora => ({
  pos: new THREE.Vector3(x, y, z),
  cor: new THREE.Color(cor),
  intensidade,
  alcance,
  sala,
  fator,
})

const HEMI: Record<string, number> = {
  atrio: 0.6,
  g01: 0.36,
  g02: 0.38,
  g03: 0.36,
  g04: 0.3,
  g05: 0.12,
  escada: 0.3,
  sala004: 0.4,
  servico: 0.32,
  s014: 0.16,
}
const SALAS_FECHADAS = new Set(['g05', 's014', 'servico', 'escada', 'sala004'])

interface Slot {
  luz: THREE.PointLight
  ancora: Ancora | null
  proxima: Ancora | null
  nivel: number
}

export class Luzes {
  readonly sol: THREE.DirectionalLight
  readonly hemi: THREE.HemisphereLight
  readonly spots: Record<'sombra' | 'pintura' | 'relogio' | 'janela', THREE.SpotLight>
  readonly ancoras: Ancora[]
  private slots: Slot[] = []
  /** escurecimento do vestíbulo durante a passagem para a Sala 014 (0 a 1) */
  vestibulo = 1
  /** luz da Galeria 05 (diminui quando o visitante fica parado) */
  g05 = 1

  constructor(cena: THREE.Scene, q: Qualidade) {
    this.sol = new THREE.DirectionalLight('#ffe2c0', 3.4)
    const dir = new THREE.Vector3(-0.62, 0.6, 0.5).normalize()
    this.sol.position.copy(dir.multiplyScalar(110)).add(new THREE.Vector3(-6, 0, -4))
    this.sol.target.position.set(-6, 0, -4)
    this.sol.castShadow = true
    const s = this.sol.shadow
    s.mapSize.setScalar(q === 'alta' ? 4096 : 2048)
    const cam = s.camera as THREE.OrthographicCamera
    cam.left = -62
    cam.right = 62
    cam.top = 62
    cam.bottom = -62
    cam.near = 40
    cam.far = 220
    s.bias = -0.00035
    s.normalBias = 0.035
    s.radius = 3
    cena.add(this.sol, this.sol.target)

    this.hemi = new THREE.HemisphereLight('#d9dee4', '#5f574d', 0.55)
    cena.add(this.hemi)

    const spot = (cor: string, intensidade: number, angulo: number, pos: [number, number, number], alvo: [number, number, number], sombra = 0, alcance = 16) => {
      const l = new THREE.SpotLight(cor, intensidade, alcance, angulo, 0.65, 2)
      l.position.set(...pos)
      l.target.position.set(...alvo)
      if (sombra) {
        l.castShadow = true
        l.shadow.mapSize.setScalar(sombra)
        l.shadow.bias = -0.0004
        l.shadow.normalBias = 0.02
        l.shadow.camera.near = 0.5
        l.shadow.camera.far = alcance + 2
        l.shadow.radius = 4
      }
      cena.add(l, l.target)
      return l
    }
    this.spots = {
      sombra: spot('#fff1dc', 620, 0.13, [-27.1, 5.8, 7.0], [-27.2, 1.15, -7.6], q === 'baixa' ? 512 : 1024, 24),
      pintura: spot('#ffefd8', 70, 0.27, [24, 5.6, -28.6], [24, 2.0, -33]),
      relogio: spot('#f6f2ea', 55, 0.3, [28.8, 5.6, 0], [33, 3.4, 0]),
      janela: spot('#ff9a52', 260, 0.42, [21.4, 3.9, 10.9], [20.4, 0, 1.4], q === 'baixa' ? 512 : 1024),
    }
    // o refletor da sombra também enxerga a camada 3 (o vaso que não está lá)
    this.spots.sombra.shadow.camera.layers.enable(3)
    this.spots.janela.penumbra = 0.25
    this.spots.sombra.penumbra = 0.35

    this.ancoras = [
      a(0, 7.5, -1, '#ffe7cc', 70, 24, 'atrio'),
      a(6.2, 3.3, 7.4, '#ffe2bd', 16, 9, 'atrio'),
      a(-22, 5.3, 1, '#fff3e2', 69, 13, 'g01'),
      a(-14.5, 5.1, -4, '#fff3e2', 18, 10, 'g01'),
      a(-40.5, 3.7, 3.8, '#f3efe7', 18, 9, 'escada'),
      a(-40.5, 5.7, -3.3, '#f3efe7', 14, 8, 'escada'),
      a(0, 5.3, -17, '#fff2df', 58, 12, 'g02'),
      a(0, 5.3, -27.5, '#fff2df', 50, 12, 'g02'),
      a(4, 2.3, -30.6, '#ffc98f', 5, 4.5, 'g02'),
      a(-4.2, 2.95, -28.8, '#ffd9a8', 9, 6.5, 'sala004'),
      a(22, 5.3, 0, '#fff3e2', 60, 13, 'g03'),
      a(15, 5.1, -1, '#fff3e2', 12, 9, 'g03'),
      a(22, 5.3, -20.5, '#f4efe8', 22, 15, 'g04'),
      a(29.5, 5.2, -26, '#f4efe8', 12, 9, 'g04'),
      a(-22, 5.2, -21, '#c9d2dc', 9, 12, 'g05', () => this.g05),
      a(-17, 3.0, -36.3, '#e6f0ff', 11, 9, 'servico'),
      a(-8.5, 3.0, -36.3, '#e6f0ff', 9, 8, 'servico'),
      a(-2.7, 2.62, -36.4, '#f5f2ea', 5, 4.5, 'servico', () => this.vestibulo),
      a(398.3, 2.62, -36.4, '#f5f2ea', 5, 4.5, 's014', () => this.vestibulo),
      a(407.3, 4.4, -36.3, '#ffd7a6', 12, 13, 's014'),
      a(411.8, 1.5, -40.9, '#ffc27a', 6, 5, 's014'),
    ]
    const n = q === 'alta' ? 8 : q === 'media' ? 6 : 4
    for (let i = 0; i < n; i++) {
      const luz = new THREE.PointLight('#ffffff', 0, 10, 2)
      luz.position.set(0, -50, 0)
      cena.add(luz)
      this.slots.push({ luz, ancora: null, proxima: null, nivel: 0 })
    }
  }

  /** liga ou desliga a sombra do sol (o mapa é estático; só refaz quando algo muda) */
  pedirSombras(renderer: THREE.WebGLRenderer) {
    renderer.shadowMap.needsUpdate = true
  }

  atualizar(dt: number, p: THREE.Vector3, sala: string, longe: boolean) {
    // o sol não alcança a sala que fica fora da planta
    this.sol.intensity = longe ? 0 : 3.4
    // a luz do céu (o preenchimento geral) muda com a sala: as salas escuras são escuras
    const ceu = HEMI[sala] ?? 0.55
    this.hemi.intensity += (ceu - this.hemi.intensity) * Math.min(1, dt * 1.2)
    // escolhe as âncoras mais relevantes: as da sala atual primeiro, depois as mais próximas;
    // nas salas escuras, só as da própria sala (luz pontual atravessa parede)
    const fechada = SALAS_FECHADAS.has(sala)
    const nota = (an: Ancora) => {
      const d = Math.hypot(an.pos.x - p.x, (an.pos.y - p.y - 2) * 0.5, an.pos.z - p.z)
      if (fechada && an.sala !== sala) return 1000 + d
      return d - (an.sala === sala ? 14 : 0)
    }
    const ordem = [...this.ancoras].sort((x, y) => nota(x) - nota(y)).slice(0, this.slots.length)
    const usadas = new Set(this.slots.map((s) => s.ancora).filter(Boolean))
    for (const s of this.slots) {
      if (s.ancora && !ordem.includes(s.ancora)) {
        s.proxima = ordem.find((an) => !usadas.has(an) && !this.slots.some((o) => o.proxima === an)) ?? null
        if (s.proxima) usadas.add(s.proxima)
      }
      if (!s.ancora) {
        const livre = ordem.find((an) => !usadas.has(an))
        if (livre) {
          s.ancora = livre
          usadas.add(livre)
          s.nivel = 0
          this.posicionar(s)
        }
      }
    }
    for (const s of this.slots) {
      const trocar = s.proxima !== null
      const alvo = trocar || !s.ancora ? 0 : 1
      s.nivel += (alvo - s.nivel) * Math.min(1, dt * (trocar ? 6 : 2.2))
      if (trocar && s.nivel < 0.02) {
        s.ancora = s.proxima
        s.proxima = null
        s.nivel = 0
        this.posicionar(s)
      }
      const f = s.ancora?.fator ? s.ancora.fator() : 1
      s.luz.intensity = s.ancora ? s.ancora.intensidade * s.nivel * f : 0
    }
  }

  private posicionar(s: Slot) {
    if (!s.ancora) return
    s.luz.position.copy(s.ancora.pos)
    s.luz.color.copy(s.ancora.cor)
    s.luz.distance = s.ancora.alcance
  }
}
