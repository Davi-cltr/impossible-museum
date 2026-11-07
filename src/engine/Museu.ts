// O motor: monta o museu, roda o laço, recebe mouse, teclado e toque, e conversa com a
// interface pela sessão e pela memória (core/estado).
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OBRA, type GaleriaId } from '../content/acervo'
import { lt, tr } from '../content/textos'
import { aviso, lembrar, memoria, mudarMemoria, mudarSessao, registrarVisita, sessao, type Qualidade } from '../core/estado'
import { som, type Piso } from '../core/som'
import { canvasTexto, criarMateriais, gerarTexturas, type Materiais } from './base'
import { Jogador, OLHOS } from './jogador'
import { Luzes } from './luzes'
import { construirMundo, noHallEscada, type Bloco, type Letreiro, type Mundo } from './mundo'
import { caminhoEspiral, Grade, livre2D, posicaoEspiral, retaPossivel } from './navegacao'
import { dentroSala004, ESCADA, espacoEm, PONTO, PONTOS, TOUR, TOUR_014, type Ponto } from './planta'
import { Porta } from './portas'
import { criarAtrioEG01 } from './pecas/atrio'
import { criarG02 } from './pecas/g02'
import { criarG03 } from './pecas/g03'
import { criarG04 } from './pecas/g04'
import { criarG05 } from './pecas/g05'
import { criarS014, noMapa } from './pecas/s014'
import type { Contexto, Interativo, Peca } from './pecas/comum'

type Sala = GaleriaId | 'fora'

/** na entrada, a câmera fica à esquerda do eixo e olha para a porta: o título ocupa a esquerda da tela */
const YAW_ENTRADA = -0.2

/** para onde se olha diante de cada obra */
const FOCOS: Record<string, THREE.Vector3> = {
  '001': new THREE.Vector3(-33.6, 1.7, 0),
  '002': new THREE.Vector3(32.95, 1.8, -21),
  '003': new THREE.Vector3(33, 3.4, 0),
  '004': new THREE.Vector3(-1.8, 1.4, -28.8),
  '005': new THREE.Vector3(24, 2.2, -32.95),
  '006': new THREE.Vector3(-27.2, 1.3, -7.0),
  '007': new THREE.Vector3(22, 2.2, 8.2),
}

const NEVOA: Record<string, [string, number]> = {
  fora: ['#d9d0c1', 0.0085],
  atrio: ['#d4cec4', 0.0065],
  g01: ['#d6d2ca', 0.008],
  g02: ['#d6d1c8', 0.008],
  g03: ['#d6d2ca', 0.008],
  g04: ['#7d7b77', 0.012],
  g05: ['#232322', 0.05],
  escada: ['#121212', 0.088],
  sala004: ['#d2cbc0', 0.01],
  servico: ['#33363a', 0.03],
  s014: ['#211d1a', 0.03],
}

const EXPOSICAO: Record<string, number> = {
  fora: 0.92,
  atrio: 1.0,
  g01: 0.96,
  g02: 0.98,
  g03: 0.96,
  g04: 1.12,
  g05: 1.0,
  escada: 1.1,
  sala004: 1.08,
  servico: 1.04,
  s014: 1.12,
}

const GRAO = {
  uniforms: { tDiffuse: { value: null }, uTempo: { value: 0 }, uGrao: { value: 0.035 }, uVinheta: { value: 0.28 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTempo; uniform float uGrao; uniform float uVinheta; varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float n = h(floor(gl_FragCoord.xy) + fract(uTempo * 7.31) * 100.0) - 0.5;
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb += n * uGrao * (1.0 - lum * 0.6);
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - uVinheta * smoothstep(0.35, 0.85, length(d * vec2(1.1, 1.0)));
      gl_FragColor = c;
    }`,
}

/** céu de fim de tarde, pintado num mapa equirretangular */
function ceu(sol: THREE.Vector3) {
  const tex = canvasTexto(
    2048,
    1024,
    (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h)
      gr.addColorStop(0, '#6f8db0')
      gr.addColorStop(0.28, '#9db2c8')
      gr.addColorStop(0.44, '#d8d3c8')
      gr.addColorStop(0.5, '#e3d6c2')
      gr.addColorStop(0.52, '#b9b0a2')
      gr.addColorStop(1, '#8c857a')
      g.fillStyle = gr
      g.fillRect(0, 0, w, h)
      const u = Math.atan2(sol.z, sol.x) / (Math.PI * 2) + 0.5
      const v = Math.asin(sol.y) / Math.PI + 0.5
      const sx = u * w
      const sy = (1 - v) * h
      for (const dx of [-w, 0, w]) {
        const halo = g.createRadialGradient(sx + dx, sy, 2, sx + dx, sy, w * 0.22)
        halo.addColorStop(0, 'rgba(255,246,226,0.95)')
        halo.addColorStop(0.05, 'rgba(255,232,196,0.55)')
        halo.addColorStop(0.4, 'rgba(255,214,170,0.12)')
        halo.addColorStop(1, 'rgba(255,214,170,0)')
        g.fillStyle = halo
        g.fillRect(0, 0, w, h)
      }
      // nuvens altas e finas
      let r = 7
      const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647)
      for (let i = 0; i < 60; i++) {
        const y = h * (0.12 + rnd() * 0.3)
        g.fillStyle = `rgba(255,250,244,${0.05 + rnd() * 0.08})`
        g.beginPath()
        g.ellipse(rnd() * w, y, w * (0.03 + rnd() * 0.09), h * (0.004 + rnd() * 0.006), 0, 0, Math.PI * 2)
        g.fill()
      }
    },
    1,
  )
  tex.mapping = THREE.EquirectangularReflectionMapping
  return tex
}

export interface PosicaoMapa {
  x: number
  z: number
  yaw: number
  nivel: number
  sala: Sala
}

export class Museu {
  readonly renderer: THREE.WebGLRenderer
  readonly cena = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly jogador = new Jogador()
  private composer: EffectComposer | null = null
  private grao: ShaderPass | null = null
  private readonly hospedeiro: HTMLElement
  private mats!: Materiais
  private mundo!: Mundo
  private luzes!: Luzes
  private portas: Record<string, Porta> = {}
  private interativos: Interativo[] = []
  private porObjeto = new Map<THREE.Object3D, Interativo>()
  private letreiros: Letreiro[] = []
  private pecas: Peca[] = []
  private grade!: Grade
  private gradeLonge!: Grade
  private ctx!: Contexto
  private tempo = 0
  private ultimo = 0
  private rodando = false
  private sala: Sala = 'fora'
  private perto: { id: string; desde: number } | null = null
  private vidros: THREE.Object3D[] = []
  private raio = new THREE.Raycaster()
  private ponteiro = new THREE.Vector2(9, 9)
  private ponteiroMudou = false
  private ultimoRaio = 0
  private marca!: THREE.Mesh
  private pulso!: THREE.Mesh
  private pulsoT = 1
  private qualidade: Qualidade
  private amostras: number[] = []
  private paradoG05 = 0
  private exposicao = 1
  private nevoaCor = new THREE.Color()
  private blocoPortaEscada!: Bloco
  private drift = 0
  private contaQuadros = 0
  private abaixo = { x: 0, y: 0, ux: 0, uy: 0, t: 0, ativo: false, arrastou: false, id: -1 }

  constructor(hospedeiro: HTMLElement) {
    this.hospedeiro = hospedeiro
    this.qualidade = sessao.qualidade
    const q = this.qualidade
    this.renderer = new THREE.WebGLRenderer({ antialias: q === 'baixa', powerPreference: 'high-performance', stencil: false })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.AgXToneMapping
    this.renderer.toneMappingExposure = 1
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.shadowMap.autoUpdate = false
    this.renderer.setPixelRatio(this.razaoPixel())
    this.renderer.domElement.className = 'palco'
    this.renderer.domElement.setAttribute('aria-hidden', 'true')
    hospedeiro.appendChild(this.renderer.domElement)
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.05, 900)
    this.camera.layers.enable(1)
    this.cena.fog = new THREE.FogExp2('#d9d0c1', 0.0085)
  }

  private razaoPixel() {
    const dpr = window.devicePixelRatio || 1
    return Math.min(dpr, this.qualidade === 'alta' ? 2 : this.qualidade === 'media' ? 1.5 : 1.35)
  }

  /** constrói tudo; `progresso` recebe de 0 a 1 */
  async iniciar(progresso: (p: number) => void) {
    const passo = (p: number) => {
      progresso(p)
      return new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)))
    }
    await passo(0.04)
    try {
      await Promise.all([
        document.fonts.load('400 40px "Instrument Serif"'),
        document.fonts.load('italic 400 40px "Instrument Serif"'),
        document.fonts.load('500 40px "Geist Variable"'),
        document.fonts.load('500 40px "Geist Mono Variable"'),
      ])
    } catch {
      /* segue com as fontes do sistema */
    }
    await passo(0.1)
    const tx = gerarTexturas(this.qualidade === 'baixa' ? 512 : 1024)
    await passo(0.42)
    this.mats = criarMateriais(tx)
    this.mundo = construirMundo(this.mats)
    this.cena.add(this.mundo.grupo)
    await passo(0.55)
    this.luzes = new Luzes(this.cena, this.qualidade)
    const sol = this.luzes.sol.position.clone().sub(this.luzes.sol.target.position).normalize()
    this.cena.background = ceu(sol)
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.cena.environmentIntensity = 0.22
    pmrem.dispose()
    this.portasDaEntrada()
    this.criarContexto()
    await passo(0.62)
    this.pecas.push(criarAtrioEG01(this.ctx), criarG02(this.ctx), criarG03(this.ctx))
    await passo(0.7)
    this.pecas.push(criarG04(this.ctx), criarG05(this.ctx), criarS014(this.ctx))
    this.blocoPortaEscada = this.mundo.blocoPortaEscada
    for (const i of this.interativos)
      for (const o of i.objetos) o.traverse((d) => this.porObjeto.set(d, i))
    this.cena.traverse((o) => {
      const m = (o as THREE.Mesh).material
      if (m === this.mats.vidro || (Array.isArray(m) && m.includes(this.mats.vidro))) this.vidros.push(o)
    })
    this.marcadores()
    await passo(0.8)
    this.grade = new Grade(-46, -41, 35, 35, 0.25, this.mundo.blocos)
    this.gradeLonge = new Grade(395, -44, 415, -29, 0.25, this.mundo.blocos)
    await passo(0.86)
    this.posProcesso()
    this.redimensionar()
    this.jogador.posicionar(-5.2, 31.2, YAW_ENTRADA, 0.1)
    this.jogador.reduzido = sessao.reduzido
    this.jogador.aoPasso = (f) => this.passo(f)
    this.jogador.aoNivel = (n, antes) => this.mudouNivel(n, antes)
    this.jogador.aoParar = () => this.pecas.forEach((p) => p.aoParar?.(this.ctx))
    this.mundo.escada.atualizar(1)
    this.atualizarSala(true)
    this.renderer.shadowMap.needsUpdate = true
    this.jogador.atualizar(0, this.mundo.blocos, this.camera)
    try {
      await this.renderer.compileAsync(this.cena, this.camera)
    } catch {
      /* compila no primeiro quadro */
    }
    await passo(0.96)
    this.eventos()
    this.rodando = true
    this.ultimo = performance.now()
    requestAnimationFrame(this.laco)
    await passo(1)
    mudarSessao({ pronto: true, carregado: 1 })
  }

  private portasDaEntrada() {
    const entrada = new Porta({
      id: 'entrada',
      tipo: 'correr',
      eixo: 'x',
      centro: [0, 11.2],
      largura: 6,
      altura: 4.2,
      folha: this.mats.vidro,
      quadro: this.mats.aco,
      som: 'vidro',
      automatica: 3.8,
    })
    entrada.aoMover = (abrindo) => som.porta('vidro', abrindo)
    this.portas.entrada = entrada
    this.cena.add(entrada.grupo)
    this.mundo.blocos.push(entrada.bloco)
  }

  private criarContexto() {
    const fwd = new THREE.Vector3()
    const dir = new THREE.Vector3()
    this.ctx = {
      cena: this.cena,
      mats: this.mats,
      camera: this.camera,
      renderer: this.renderer,
      jogador: this.jogador,
      mundo: this.mundo,
      luzes: this.luzes,
      portas: this.portas,
      qualidade: this.qualidade,
      interativos: this.interativos,
      letreiros: this.letreiros,
      sala: () => (this.sala === 'fora' ? 'atrio' : this.sala),
      olhando: (p, ang, dist) => {
        const c = this.camera.position
        const d = c.distanceTo(p)
        if (d > dist) return false
        this.camera.getWorldDirection(fwd)
        dir.subVectors(p, c).normalize()
        if (fwd.dot(dir) < Math.cos(ang)) return false
        return livre2D(c.x, c.z, p.x - dir.x * 0.08, p.z - dir.z * 0.08, this.mundo.blocos, 0, true)
      },
      abrirDocumento: (id) => this.abrirDocumento(id),
      irParaPonto: (id) => this.irParaPonto(id),
      pedirSombras: () => (this.renderer.shadowMap.needsUpdate = true),
      descobrir: (tipo, id, texto) => this.descobrir(tipo, id, texto),
      tempo: () => this.tempo,
    }
  }

  private marcadores() {
    const anel = canvasTexto(
      128,
      128,
      (g, w, h) => {
        g.clearRect(0, 0, w, h)
        g.strokeStyle = 'rgba(255,255,255,0.95)'
        g.lineWidth = 5
        g.beginPath()
        g.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2)
        g.stroke()
        g.fillStyle = 'rgba(255,255,255,0.9)'
        g.beginPath()
        g.arc(w / 2, h / 2, w * 0.05, 0, Math.PI * 2)
        g.fill()
      },
      1,
    )
    const m = new THREE.MeshBasicMaterial({ map: anel, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    m.polygonOffset = true
    m.polygonOffsetFactor = -4
    this.marca = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), m)
    this.marca.rotation.x = -Math.PI / 2
    this.marca.renderOrder = 3
    this.marca.userData.semRaio = true
    this.pulso = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), m.clone())
    this.pulso.rotation.x = -Math.PI / 2
    this.pulso.renderOrder = 3
    this.pulso.userData.semRaio = true
    this.cena.add(this.marca, this.pulso)
  }

  private posProcesso() {
    const q = this.qualidade
    this.composer?.dispose()
    this.composer = null
    this.grao = null
    if (q === 'baixa') return
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
    const c = new EffectComposer(this.renderer, rt)
    c.addPass(new RenderPass(this.cena, this.camera))
    if (q === 'alta') {
      const g = new GTAOPass(this.cena, this.camera, 1, 1)
      g.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.4, thickness: 1.4, scale: 1.0, samples: 12, distanceFallOff: 1, screenSpaceRadius: false })
      g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 })
      g.blendIntensity = 0.8
      // o vidro não deve sombrear nada no AO
      const render = g.render.bind(g)
      g.render = (...args: Parameters<GTAOPass['render']>) => {
        this.vidros.forEach((v) => (v.visible = false))
        render(...args)
        this.vidros.forEach((v) => (v.visible = true))
      }
      c.addPass(g)
    }
    c.addPass(new OutputPass())
    const grao = new ShaderPass(GRAO)
    c.addPass(grao)
    this.grao = grao
    this.composer = c
  }

  redimensionar() {
    const w = this.hospedeiro.clientWidth || window.innerWidth
    const h = this.hospedeiro.clientHeight || window.innerHeight
    this.renderer.setPixelRatio(this.razaoPixel())
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    // retrato (celular em pé): campo de visão maior
    this.camera.fov = w / h < 0.8 ? 74 : w / h < 1.2 ? 68 : 62
    this.camera.updateProjectionMatrix()
    this.composer?.setPixelRatio(this.renderer.getPixelRatio())
    this.composer?.setSize(w, h)
  }

  definirQualidade(q: Qualidade) {
    if (q === this.qualidade) return
    this.qualidade = q
    sessao.qualidade = q
    this.ctx.qualidade = q
    this.posProcesso()
    this.redimensionar()
    const s = q === 'alta' ? 4096 : 2048
    const sombra = this.luzes.sol.shadow
    if (sombra.mapSize.x !== s) {
      sombra.mapSize.setScalar(s)
      sombra.map?.dispose()
      sombra.map = null
    }
    this.renderer.shadowMap.needsUpdate = true
  }

  definirReduzido(r: boolean) {
    this.jogador.reduzido = r
  }

  aoMudarIdioma() {
    this.letreiros.forEach((l) => l.redesenhar())
  }

  // ——— entrada

  entrar() {
    som.iniciar(memoria.som)
    registrarVisita()
    if (sessao.reduzido) {
      this.pular()
      return
    }
    mudarSessao({ fase: 'chegando' })
    this.jogador.olharPara(0, 0.06)
    this.jogador.seguir({
      pontos: [
        [this.jogador.pos.x, this.jogador.pos.z],
        [0, 17],
        [0, 11.2],
        [0, 8.6],
      ],
      velocidade: 2.3,
      olharCaminho: false,
      yawFinal: 0,
      pitchFinal: 0,
      aoChegar: () => mudarSessao({ fase: 'museu' }),
    })
  }

  pular() {
    this.jogador.posicionar(0, 8.6, 0, 0)
    mudarSessao({ fase: 'museu' })
  }

  // ——— caminhos

  private caminhoPara(x: number, z: number): [number, number][] | null {
    const p = this.jogador.pos
    const longe = p.x > 300
    if (longe !== x > 300) return null
    const grade = longe ? this.gradeLonge : this.grade
    let prefixo: [number, number][] = []
    let ini: [number, number] = [p.x, p.z]
    if (noHallEscada(p.x, p.z) && (this.jogador.nivel !== 1 || Math.abs(p.y) > 0.05) && !noHallEscada(x, z)) {
      prefixo = caminhoEspiral(p, 1 - this.jogador.nivel)
      ini = prefixo[prefixo.length - 1]
    }
    // portas destrancadas não impedem o caminho: o visitante as abre ao passar
    const ignorar = this.portasPassaveis().map((p) => p.bloco)
    if (prefixo.length) ignorar.push(this.blocoPortaEscada)
    const resto = grade.caminho(ini[0], ini[1], x, z, ignorar)
    if (!resto) return prefixo.length ? prefixo : null
    return prefixo.length ? [...prefixo, ...resto.slice(1)] : resto
  }

  private portasPassaveis() {
    return Object.values(this.portas).filter((p) => p.opcoes.tipo !== 'fixa' && !p.trancada && p.grupo.visible && !p.id.startsWith('vest'))
  }

  /** abre as portas que estão no caminho de quem está andando por um trajeto */
  private abrirNoCaminho() {
    if (!this.jogador.caminhando) return
    const p = this.jogador.pos
    const agora = performance.now()
    for (const porta of this.portasPassaveis()) {
      // uma porta que acabou de ser fechada (pela passagem, ou por alguém) fica fechada
      if (porta.alvo > 0.5 || agora - porta.fechadaEm < 5000) continue
      const [cx, cz] = porta.opcoes.centro
      if (Math.hypot(p.x - cx, p.z - cz) < 3.4) porta.abrir()
    }
  }

  irParaPonto(id: string) {
    const pt = PONTO[id]
    if (!pt) return
    const c = this.caminhoPara(pt.pos[0], pt.pos[1])
    if (!c) return
    // no computador a placa ocupa a direita da tela: a obra fica um pouco à esquerda
    const yaw = pt.obra && !sessao.toque ? pt.yaw - 0.13 : pt.yaw
    this.jogador.seguir({ pontos: c, velocidade: sessao.toque ? 2.1 : 1.9, yawFinal: yaw, pitchFinal: pt.pitch ?? 0 })
    const i = this.listaTour().indexOf(id)
    if (i >= 0) mudarSessao({ tour: i })
  }

  irParaSala(sala: GaleriaId) {
    const p = PONTOS.find((q) => q.sala === sala && !q.obra) ?? PONTOS.find((q) => q.sala === sala)
    if (p) this.irParaPonto(p.id)
  }

  private disponivel(p: Ponto) {
    if (p.sala === 'servico') {
      if (!this.mundo.servico.revelado) return false
      if (p.id === 'vestibulo') return !!this.portas['014'] && !this.portas['014'].trancada
    }
    return true
  }

  private listaTour() {
    if (this.jogador.pos.x > 300) return TOUR_014
    return TOUR.filter((id) => this.disponivel(PONTO[id]))
  }

  tour(dir: 1 | -1) {
    const lista = this.listaTour()
    const atual = lista.indexOf(PONTOS.find((p) => Math.hypot(p.pos[0] - this.jogador.pos.x, p.pos[1] - this.jogador.pos.z) < 1.2)?.id ?? '')
    const base = atual >= 0 ? atual : Math.min(sessao.tour, lista.length - 1)
    const i = (base + dir + lista.length) % lista.length
    mudarSessao({ tour: i })
    this.irParaPonto(lista[i])
  }

  escada(dir: 1 | -1) {
    const p = this.jogador.pos
    if (!noHallEscada(p.x, p.z)) return
    const s = posicaoEspiral(p.x, p.y, p.z)
    const c = caminhoEspiral(p, Math.round(s) + dir)
    this.jogador.seguir({ pontos: c, velocidade: 1.9, olharCaminho: true })
  }

  // ——— documentos e descobertas

  abrirDocumento(id: string) {
    if (lembrar('documentos', id)) aviso(tr('documentoAchado'), 'info')
    if (id === 'gravacao-escada') som.fita(true)
    else som.papel()
    mudarSessao({ painel: 'documento', documento: id })
  }

  private descobrir(tipo: 'obra' | 'anomalia' | 'achada' | 'segredo', id: string, texto?: string) {
    const lista = ({ obra: 'obras', anomalia: 'anomalias', achada: 'achadas', segredo: 'segredos' } as const)[tipo]
    if (!lembrar(lista, id)) return false
    const o = OBRA[id]
    if (tipo === 'obra' && o && !o.oculta) aviso(`${tr('obra')} ${id} · ${lt(o.titulo)} — ${tr('observado').toLowerCase()}`, 'obra')
    if (tipo === 'achada') {
      aviso(texto ?? `${tr('novaObra')} · ${id} ${o ? lt(o.titulo) : ''}`, 'obra')
      som.sino(true)
    }
    if (tipo === 'anomalia' && !(o && o.oculta)) {
      aviso(`${tr('anomaliaVista')} · ${tr('obra')} ${id}`, 'segredo')
      som.sino()
    }
    if (tipo === 'segredo') {
      aviso(texto ?? tr('anomaliaVista'), 'segredo')
      som.sino(true)
    }
    return true
  }

  private observar(id: string) {
    const o = OBRA[id]
    if (!o) return
    if (o.oculta) {
      this.descobrir('achada', id)
      lembrar('obras', id)
      // A Sombra e A Janela se revelam no mesmo instante em que são vistas
      if (id === '006' || id === '007') lembrar('anomalias', id)
    } else this.descobrir('obra', id)
  }

  private mudouNivel(n: number, antes: number) {
    this.mundo.escada.atualizar(n)
    this.mundo.escada.gravador.updateMatrixWorld(true)
    if (Math.abs(n - 1) >= 3) this.descobrir('anomalia', '001')
    if (n > memoria.escadaMaisAlta) mudarMemoria({ escadaMaisAlta: n })
    mudarSessao({ nivel: n })
    void antes
  }

  private passo(forca: number) {
    const p = this.jogador.pos
    let piso: Piso = 'piso'
    if (this.sala === 'fora') piso = 'travertino'
    else if (noHallEscada(p.x, p.z)) piso = 'granilite'
    else if (dentroSala004(p.x, p.z)) piso = 'nogueira'
    else {
      const e = espacoEm(p.x, p.z)
      if (e) piso = (['madeira', 'nogueira', 'servico', 'granilite', 'travertino'].includes(e.piso) ? e.piso : 'piso') as Piso
    }
    som.passo(piso, forca)
    this.pecas.forEach((pc) => pc.aoPasso?.(this.ctx))
  }

  // ——— sala atual, névoa, acústica

  private qualSala(): Sala {
    const p = this.jogador.pos
    if (p.x > 300) return p.x > 400.4 ? 's014' : 'servico'
    if (noHallEscada(p.x, p.z) && p.x < ESCADA.x1 - 0.05) return 'escada'
    if (dentroSala004(p.x, p.z)) return 'sala004'
    if (p.z > 11.3) return 'fora'
    const e = espacoEm(p.x, p.z)
    if (!e) return 'fora'
    return e.sala
  }

  private atualizarSala(forcar = false) {
    const s = this.qualSala()
    if (s === this.sala && !forcar) return
    this.sala = s
    som.definirSala(s)
    if (s !== 'fora') lembrar('salas', s)
    mudarSessao({ sala: s === 'fora' ? 'atrio' : s })
  }

  posicaoMapa(): PosicaoMapa {
    const p = this.jogador.pos
    return { x: noMapa(p.x), z: p.z, yaw: this.jogador.yaw, nivel: this.jogador.nivel, sala: this.sala }
  }

  // ——— entrada do usuário

  private eventos() {
    const el = this.renderer.domElement
    el.addEventListener('pointerdown', (e) => {
      if (sessao.fase !== 'museu' || sessao.painel !== 'nenhum') return
      el.setPointerCapture(e.pointerId)
      this.abaixo = { x: e.clientX, y: e.clientY, ux: e.clientX, uy: e.clientY, t: performance.now(), ativo: true, arrastou: false, id: e.pointerId }
      el.classList.add('arrastando')
    })
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      this.ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      this.ponteiroMudou = true
      const a = this.abaixo
      if (!a.ativo || a.id !== e.pointerId) return
      if (!a.arrastou && Math.hypot(e.clientX - a.x, e.clientY - a.y) > (e.pointerType === 'touch' ? 9 : 5)) a.arrastou = true
      if (a.arrastou) this.jogador.arrastar(e.clientX - a.ux, e.clientY - a.uy, e.pointerType === 'touch' ? 0.0055 : 0.0038)
      a.ux = e.clientX
      a.uy = e.clientY
    })
    const soltar = (e: PointerEvent) => {
      const a = this.abaixo
      if (!a.ativo || a.id !== e.pointerId) return
      a.ativo = false
      el.classList.remove('arrastando')
      if (!a.arrastou && performance.now() - a.t < 600) this.clique(e)
    }
    el.addEventListener('pointerup', soltar)
    el.addEventListener('pointercancel', (e) => {
      this.abaixo.ativo = false
      el.classList.remove('arrastando')
      void e
    })
    el.addEventListener('pointerleave', () => {
      this.ponteiro.set(9, 9)
      this.ponteiroMudou = true
    })
    el.addEventListener(
      'wheel',
      (e) => {
        if (sessao.fase !== 'museu' || sessao.painel !== 'nenhum') return
        e.preventDefault()
        this.jogador.roda = THREE.MathUtils.clamp(this.jogador.roda - e.deltaY * 0.004, -1, 1)
      },
      { passive: false },
    )
    window.addEventListener('keydown', (e) => {
      const alvo = e.target as HTMLElement
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)) return
      if (sessao.fase !== 'museu') return
      if (sessao.painel !== 'nenhum') return
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        this.jogador.teclas.add(e.code)
        if (e.code.startsWith('Arrow')) e.preventDefault()
      }
    })
    window.addEventListener('keyup', (e) => this.jogador.teclas.delete(e.code))
    window.addEventListener('blur', () => this.jogador.teclas.clear())
    window.addEventListener('resize', () => this.redimensionar())
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.rodando = false
        som.ctx?.suspend()
      } else if (!this.rodando) {
        this.rodando = true
        this.ultimo = performance.now()
        if (som.ligado) som.ctx?.resume()
        requestAnimationFrame(this.laco)
      }
    })
  }

  /** painéis abertos prendem o visitante e abafam o som */
  painelAberto(sim: boolean) {
    this.jogador.preso = sim
    if (sim) this.jogador.teclas.clear()
    som.abafado(sim)
    if (!sim) som.fita(false)
  }

  private lancarRaio(): { i: Interativo | null; ponto: THREE.Vector3 | null; chao: boolean; dist: number } {
    this.raio.setFromCamera(this.ponteiro, this.camera)
    this.raio.far = 60
    const hits = this.raio.intersectObjects(this.cena.children, true)
    for (const h of hits) {
      const o = h.object as THREE.Mesh
      if (o.userData.semRaio || (o as unknown as THREE.Sprite).isSprite || !o.visible) continue
      const m = o.material
      if (m === this.mats.vidro || (m as THREE.Material)?.transparent && (m as THREE.MeshBasicMaterial).depthWrite === false) continue
      // um visível de verdade: algum ancestral invisível o esconde
      let vis = true
      for (let a: THREE.Object3D | null = o; a; a = a.parent) if (!a.visible) vis = false
      if (!vis) continue
      const i = this.porObjeto.get(o) ?? null
      if (i && (!i.ativo || i.ativo()) && h.distance <= (i.distancia ?? 7)) return { i, ponto: h.point, chao: false, dist: h.distance }
      const n = h.face?.normal.clone().transformDirection(o.matrixWorld)
      const chao = !!n && n.y > 0.7 && (h.point.y < this.jogador.pos.y + 0.35 || noHallEscada(h.point.x, h.point.z)) && h.point.y > this.jogador.pos.y - 2.5
      return { i: null, ponto: h.point, chao, dist: h.distance }
    }
    return { i: null, ponto: null, chao: false, dist: Infinity }
  }

  private clique(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    const h = this.lancarRaio()
    if (h.i) {
      som.toque()
      h.i.acao()
      return
    }
    if (h.chao && h.ponto) {
      const p = this.jogador.pos
      let c: [number, number][] | null
      if (noHallEscada(p.x, p.z) && noHallEscada(h.ponto.x, h.ponto.z)) {
        c = retaPossivel(p, h.ponto.x, h.ponto.z, this.mundo.blocos) ? [[p.x, p.z], [h.ponto.x, h.ponto.z]] : caminhoEspiral(p, { x: h.ponto.x, y: h.ponto.y, z: h.ponto.z })
      } else c = this.caminhoPara(h.ponto.x, h.ponto.z)
      if (!c) return
      this.jogador.seguir({ pontos: c, velocidade: 1.9 })
      this.pulso.position.copy(h.ponto).add(new THREE.Vector3(0, 0.012, 0))
      this.pulsoT = 0
    }
  }

  private hover(agora: number) {
    if (sessao.toque || sessao.fase !== 'museu' || sessao.painel !== 'nenhum') {
      if (sessao.alvo) mudarSessao({ alvo: null })
      ;(this.marca.material as THREE.MeshBasicMaterial).opacity = 0
      return
    }
    if (!this.ponteiroMudou && agora - this.ultimoRaio < 250) return
    if (agora - this.ultimoRaio < 50) return
    this.ultimoRaio = agora
    this.ponteiroMudou = false
    if (this.abaixo.ativo && this.abaixo.arrastou) return
    const h = this.lancarRaio()
    let alvo: typeof sessao.alvo = null
    if (h.i) alvo = { tipo: h.i.tipo(), rotulo: h.i.rotulo() }
    else if (h.chao) alvo = { tipo: 'andar', rotulo: tr('andar') }
    const mat = this.marca.material as THREE.MeshBasicMaterial
    if (h.chao && h.ponto) {
      this.marca.position.lerp(h.ponto.clone().add(new THREE.Vector3(0, 0.012, 0)), this.marca.userData.vis ? 0.6 : 1)
      this.marca.userData.vis = true
    } else this.marca.userData.vis = false
    mat.userData.alvo = h.chao ? 0.55 : 0
    const a = sessao.alvo
    if ((a?.tipo ?? null) !== (alvo?.tipo ?? null) || a?.rotulo !== alvo?.rotulo) mudarSessao({ alvo })
  }

  // ——— o laço

  private laco = (agora: number) => {
    if (!this.rodando) return
    requestAnimationFrame(this.laco)
    const dt = Math.min(0.05, (agora - this.ultimo) / 1000)
    this.ultimo = agora
    this.tempo += dt
    this.quadro(dt, agora)
  }

  private quadro(dt: number, agora: number, desenhar = true) {
    const j = this.jogador
    if (sessao.fase === 'entrada') {
      // a câmera respira devagar diante da fachada
      this.drift += dt
      const r = sessao.reduzido ? 0 : 1
      j.alvoYaw = YAW_ENTRADA + Math.sin(this.drift * 0.11) * 0.05 * r
      j.alvoPitch = 0.1 + Math.sin(this.drift * 0.15) * 0.018 * r
    }
    j.atualizar(dt, this.mundo.blocos, this.camera)
    this.abrirNoCaminho()
    for (const k in this.portas) this.portas[k].atualizar(dt, j.pos.x, j.pos.z)
    this.atualizarSala()
    for (const p of this.pecas) p.atualizar?.(dt, this.ctx)

    // G05: quando o visitante fica parado, a luz cai um pouco
    if (this.sala === 'g05' && j.velocidade < 0.05) this.paradoG05 += dt
    else this.paradoG05 = 0
    this.luzes.g05 += ((this.paradoG05 > 7 ? 0.55 : 1) - this.luzes.g05) * Math.min(1, dt * 0.35)
    this.luzes.atualizar(dt, j.pos, this.sala === 'fora' ? 'atrio' : this.sala, j.pos.x > 300)

    // névoa e adaptação do olho
    const [cor, dens] = NEVOA[this.sala] ?? NEVOA.g01
    const k = 1 - Math.exp(-dt * 1.4)
    const fog = this.cena.fog as THREE.FogExp2
    fog.color.lerp(this.nevoaCor.set(cor), k)
    fog.density += (dens - fog.density) * k
    this.exposicao += ((EXPOSICAO[this.sala] ?? 1) - this.exposicao) * (1 - Math.exp(-dt * 0.9))
    this.renderer.toneMappingExposure = this.exposicao

    // diante de uma obra
    if (sessao.fase === 'museu') this.observarPerto()
    this.hover(agora)
    const mm = this.marca.material as THREE.MeshBasicMaterial
    mm.opacity += ((mm.userData.alvo ?? 0) - mm.opacity) * Math.min(1, dt * 10)
    if (this.pulsoT < 1) {
      this.pulsoT = Math.min(1, this.pulsoT + dt * 1.6)
      const e = 1 - Math.pow(1 - this.pulsoT, 3)
      this.pulso.scale.setScalar(1 + e * 1.6)
      ;(this.pulso.material as THREE.MeshBasicMaterial).opacity = (1 - this.pulsoT) * 0.7
    }
    if (this.grao) this.grao.uniforms.uTempo.value = this.tempo
    if (!desenhar) return
    // com um painel cobrindo a tela, o 3D não precisa ser redesenhado (poupa bateria)
    const p = sessao.painel
    if (p === 'arquivo' || p === 'mapa') return
    if ((p === 'documento' || p === 'ajustes') && (this.contaQuadros++ % 4 !== 0)) return
    if (this.composer) this.composer.render(dt)
    else this.renderer.render(this.cena, this.camera)
    this.governar(dt)
  }

  private observarPerto() {
    const p = this.jogador.pos
    let melhor: string | null = null
    let melhorD = Infinity
    for (const pt of PONTOS) {
      if (!pt.obra) continue
      const d = Math.hypot(pt.pos[0] - p.x, pt.pos[1] - p.z)
      if (d > 4.2 || d > melhorD) continue
      const foco = FOCOS[pt.obra]
      if (!foco || !this.ctx.olhando(foco, 0.62, 14)) continue
      melhor = pt.obra
      melhorD = d
    }
    if (melhor !== (this.perto?.id ?? null)) {
      this.perto = melhor ? { id: melhor, desde: this.tempo } : null
      mudarSessao({ obraPerto: melhor })
    } else if (this.perto && this.tempo - this.perto.desde > 1.3) this.observar(this.perto.id)
  }

  /** se o aparelho não acompanha, desce a qualidade sem avisar */
  private governar(dt: number) {
    if (sessao.fase !== 'museu') return
    this.amostras.push(dt)
    if (this.amostras.length < 150) return
    const media = this.amostras.reduce((a, b) => a + b, 0) / this.amostras.length
    this.amostras.length = 0
    if (memoria.qualidade !== 'auto') return
    if (media > 0.04 && this.qualidade === 'alta') this.definirQualidade('media')
    else if (media > 0.045 && this.qualidade === 'media') this.definirQualidade('baixa')
  }

  /** para os testes e para depurar */
  depurar() {
    return {
      museu: this,
      jogador: this.jogador,
      sala: () => this.sala,
      OLHOS,
      sessao,
      memoria,
      portas: this.portas,
      /** roda a lógica sem desenhar (testes em máquinas sem GPU) */
      simular: (segundos: number, passo = 1 / 30) => {
        for (let t = 0; t < segundos; t += passo) {
          this.tempo += passo
          this.quadro(passo, performance.now(), false)
        }
      },
    }
  }
}
