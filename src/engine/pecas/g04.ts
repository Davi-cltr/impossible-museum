// Galeria 04 — Percepção: O Espelho (002), cujo reflexo passa a responder atrasado e mostra
// uma placa que só existe nele; A Pintura (005), que olha para você e depois para outra coisa.
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { lt, tr } from '../../content/textos'
import { OBRA } from '../../content/acervo'
import { memoria, mudarMemoria } from '../../core/estado'
import { canvasTexto, sorteio } from '../base'
import { desenharPlaca, letreiro } from '../mundo'
import { alvo, caixa, placaObra, type Contexto, type Peca } from './comum'
import { OLHOS } from '../jogador'

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const SHADER_ESPELHO = {
  name: 'Espelho',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null } },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vUv2;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4( position, 1.0 );
      vUv2 = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    varying vec4 vUv;
    varying vec2 vUv2;
    #include <logdepthbuf_pars_fragment>
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      #include <logdepthbuf_fragment>
      vec4 base = texture2DProj( tDiffuse, vUv );
      vec2 e = abs(vUv2 - 0.5) * 2.0;
      float borda = smoothstep(0.82, 1.0, max(e.x, e.y));
      // prata antiga: manchas finas perto das bordas
      float n = h(floor(vUv2 * vec2(210.0, 320.0)));
      float mancha = smoothstep(0.55, 1.0, max(e.x, e.y)) * step(0.985, n);
      vec3 c = base.rgb * color * (1.0 - borda * 0.32) * (1.0 - mancha * 0.5);
      gl_FragColor = vec4( c, 1.0 );
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}

/** a figura do visitante: só o espelho a enxerga (camada 2) */
function visitante() {
  const g = new THREE.Group()
  const la = new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.95 })
  const calca = new THREE.MeshStandardMaterial({ color: '#232326', roughness: 0.9 })
  const pele = new THREE.MeshStandardMaterial({ color: '#b99682', roughness: 0.7 })
  const cabelo = new THREE.MeshStandardMaterial({ color: '#1e1a17', roughness: 0.9 })
  const sapato = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.5 })
  const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.42, 6, 16), la)
  tronco.scale.set(1.12, 1, 0.72)
  tronco.position.y = 1.16
  const ombros = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.32, 6, 12), la)
  ombros.rotation.z = Math.PI / 2
  ombros.scale.set(1, 1, 0.8)
  ombros.position.y = 1.4
  const pescoco = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.12, 12), pele)
  pescoco.position.y = 1.5
  const cabeca = new THREE.Group()
  cabeca.position.y = 1.56
  const rosto = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), pele)
  rosto.scale.set(0.92, 1.12, 1)
  rosto.position.y = 0.09
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.104, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), cabelo)
  cab.scale.set(0.96, 0.9, 1.06)
  cab.position.set(0, 0.112, 0.014)
  cab.rotation.x = -0.32
  cabeca.add(rosto, cab)
  const braco = (x: number) => {
    const b = new THREE.Group()
    b.position.set(x, 1.4, 0)
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.5, 4, 10), la)
    m.position.y = -0.3
    const mao = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), pele)
    mao.position.y = -0.6
    b.add(m, mao)
    return b
  }
  const perna = (x: number) => {
    const p = new THREE.Group()
    p.position.set(x, 0.86, 0)
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.7, 4, 10), calca)
    m.position.y = -0.42
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.25), sapato)
    s.position.set(0, -0.82, -0.05)
    p.add(m, s)
    return p
  }
  const bE = braco(-0.25)
  const bD = braco(0.25)
  const pE = perna(-0.1)
  const pD = perna(0.1)
  g.add(tronco, ombros, pescoco, cabeca, bE, bD, pE, pD)
  g.traverse((o) => o.layers.set(2))
  return { g, cabeca, bE, bD, pE, pD }
}

interface Amostra {
  t: number
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  fase: number
  vel: number
}

/** 002 — O Espelho */
function espelho(c: Contexto): Peca {
  const q = c.qualidade
  const [tw, th] = q === 'alta' ? [1024, 1560] : q === 'media' ? [640, 976] : [384, 586]
  const ref = new Reflector(new THREE.PlaneGeometry(2.1, 3.2), {
    textureWidth: tw,
    textureHeight: th,
    color: 0xb9b9b6,
    clipBias: 0.002,
    multisample: q === 'baixa' ? 0 : 4,
    shader: SHADER_ESPELHO,
  })
  ref.position.set(32.955, 1.78, -21)
  ref.rotation.y = -Math.PI / 2
  c.cena.add(ref)
  const camRef = ref.getReflectionCamera(c.camera)
  camRef.layers.set(0)
  camRef.layers.enable(2)
  let ativo = true
  const original = ref.onBeforeRender
  ref.onBeforeRender = function (r, s, cam, geo, mat, grupo) {
    // não refaz o reflexo nas passagens de pós-processamento, nem longe da galeria
    if (s.overrideMaterial || !ativo || cam !== c.camera) return
    original.call(this, r, s, cam, geo, mat, grupo)
  }
  // moldura de aço enegrecido
  const preto = new THREE.MeshStandardMaterial({ color: '#161616', metalness: 0.6, roughness: 0.5 })
  const W = 2.1
  const Hh = 3.2
  const f = 0.07
  for (const [w, h, y, z] of [
    [W + f * 2, f, 1.78 + Hh / 2 + f / 2, -21],
    [W + f * 2, f, 1.78 - Hh / 2 - f / 2, -21],
    [f, Hh, 1.78, -21 - W / 2 - f / 2],
    [f, Hh, 1.78, -21 + W / 2 + f / 2],
  ])
    c.cena.add(caixa(0.06, h, w, preto, 32.97, y, z))

  // o suporte com a placa: na frente, a placa de sempre; atrás, para o espelho, outra
  const px = 31.2
  const pz = -19.75
  const haste = caixa(0.025, 1.1, 0.025, preto, px, 0.55, pz)
  const base = caixa(0.26, 0.012, 0.26, preto, px, 0.006, pz)
  c.cena.add(haste, base)
  const placa = (linhas: () => [string, string, string[]], opts: { espelhada?: boolean } = {}) => {
    const l = letreiro(
      0.36,
      0.26,
      desenharPlaca(
        () => linhas()[0],
        () => linhas()[1],
        () => linhas()[2],
        opts,
      ),
      { resolucao: 1300, transparente: false },
    )
    c.letreiros.push(l)
    return l.malha
  }
  const normal = (): [string, string, string[]] => [`${tr('obra')} 002`, lt(OBRA['002'].titulo), [lt(OBRA['002'].classificacao), lt(OBRA['002'].descoberta)]]
  const frente = placa(normal)
  frente.position.set(px - 0.015, 1.18, pz)
  frente.rotation.y = -Math.PI / 2
  const verso = placa(normal)
  verso.position.set(px + 0.015, 1.18, pz)
  verso.rotation.y = Math.PI / 2
  verso.layers.set(1)
  const secreta = placa(() => [`${tr('obra')} 014`, tr('espelhoTitulo'), [tr('espelhoL1'), tr('espelhoL2')]], { espelhada: true })
  secreta.position.copy(verso.position)
  secreta.rotation.y = Math.PI / 2
  secreta.layers.set(2)
  c.cena.add(frente, verso, secreta, caixa(0.38, 0.28, 0.02, preto, px, 1.18, pz))
  frente.position.x -= 0.0
  // a placa do espelho na parede também (para quem procura)
  placaObra(c, '002', [32.985, 1.45, -23.0], -Math.PI / 2)

  const fig = visitante()
  c.cena.add(fig.g)
  const hist: Amostra[] = []
  let atraso = 0.05
  let naFrente = 0
  let viuPlaca = 0
  const centro = new THREE.Vector3(32.95, 1.7, -21)
  const pReflexo = new THREE.Vector3(34.7, 1.18, pz)
  let fase = 0
  return {
    atualizar(dt, cx) {
      const p = cx.jogador.pos
      const sala = cx.sala()
      ativo = sala === 'g04' || (sala === 'g03' && p.z < -3)
      fig.g.visible = ativo
      if (!ativo) {
        hist.length = 0
        return
      }
      const agora = cx.tempo()
      fase += (cx.jogador.velocidade * dt) / 0.75
      hist.push({ t: agora, x: p.x, y: p.y, z: p.z, yaw: cx.jogador.yaw, pitch: cx.jogador.pitch, fase, vel: cx.jogador.velocidade })
      while (hist.length > 2 && agora - hist[0].t > 2.5) hist.shift()
      const frenteEspelho = sala === 'g04' && p.x > 25.5 && Math.abs(p.z + 21) < 4.5
      naFrente = frenteEspelho ? naFrente + dt : Math.max(0, naFrente - dt * 2)
      const alvoAtraso = 0.05 + suave(2, 7.5, naFrente) * 0.82
      atraso += (alvoAtraso - atraso) * Math.min(1, dt * 0.7)
      // a pose de "atraso" segundos atrás
      const tA = agora - atraso
      let a = hist[0]
      let b = hist[hist.length - 1]
      for (let i = hist.length - 1; i > 0; i--)
        if (hist[i - 1].t <= tA) {
          a = hist[i - 1]
          b = hist[i]
          break
        }
      const k = b.t > a.t ? Math.min(1, Math.max(0, (tA - a.t) / (b.t - a.t))) : 1
      const L = (u: number, v: number) => u + (v - u) * k
      fig.g.position.set(L(a.x, b.x), L(a.y, b.y), L(a.z, b.z))
      fig.g.rotation.y = L(a.yaw, b.yaw)
      fig.cabeca.rotation.x = L(a.pitch, b.pitch) * 0.7
      const ph = L(a.fase, b.fase) * Math.PI
      const v = Math.min(1, L(a.vel, b.vel) / 1.9)
      fig.pE.rotation.x = Math.sin(ph) * 0.38 * v
      fig.pD.rotation.x = -Math.sin(ph) * 0.38 * v
      fig.bE.rotation.x = -Math.sin(ph) * 0.25 * v
      fig.bD.rotation.x = Math.sin(ph) * 0.25 * v
      // a cabeça da figura fica na altura dos olhos da câmera
      fig.g.position.y += OLHOS - 1.62

      const olhando = cx.olhando(centro, 0.55, 9)
      if (olhando && atraso > 0.42) {
        // o atraso só se percebe quando o visitante se mexe
        const antes = hist.find((h) => agora - h.t < 0.7)
        if (antes && (Math.abs(antes.yaw - cx.jogador.yaw) > 0.22 || Math.hypot(antes.x - p.x, antes.z - p.z) > 0.35)) cx.descobrir('anomalia', '002')
      }
      // a placa do espelho: o raio do olho até o reflexo do verso passa pelo vidro?
      if (olhando) {
        const e = cx.camera.position
        const t = (32.955 - e.x) / (pReflexo.x - e.x)
        const zc = e.z + (pReflexo.z - e.z) * t
        const yc = e.y + (pReflexo.y - e.y) * t
        const dentro = t > 0 && t < 1 && zc > -22.0 && zc < -20.0 && yc > 0.2 && yc < 3.3 && e.x < px - 0.3
        viuPlaca = dentro && Math.hypot(e.x - pReflexo.x, e.z - pReflexo.z) < 7.5 ? viuPlaca + dt : Math.max(0, viuPlaca - dt)
        if (viuPlaca > 2.4) cx.descobrir('segredo', 'espelho', tr('segundaDescricao'))
      }
    },
  }
}

/** o retrato pintado (sem os olhos, que são do sombreador) */
function retrato() {
  const r = sorteio(1975)
  return canvasTexto(
    880,
    1136,
    (g, w, h) => {
      const X = (u: number) => u * w
      const Y = (v: number) => v * h
      g.fillStyle = '#3b3a32'
      g.fillRect(0, 0, w, h)
      const luz = g.createRadialGradient(X(0.22), Y(0.18), 10, X(0.22), Y(0.18), w * 0.95)
      luz.addColorStop(0, 'rgba(176,164,132,0.75)')
      luz.addColorStop(0.5, 'rgba(110,104,84,0.35)')
      luz.addColorStop(1, 'rgba(20,20,16,0)')
      g.fillStyle = luz
      g.fillRect(0, 0, w, h)
      // pinceladas do fundo
      for (let i = 0; i < 3200; i++) {
        const x = r() * w
        const y = r() * h
        const l = 0.18 + r() * 0.2 + (1 - y / h) * 0.12 * (1 - x / w)
        g.strokeStyle = `rgba(${l * 255},${l * 248},${l * 205},${0.05 + r() * 0.06})`
        g.lineWidth = 3 + r() * 9
        g.beginPath()
        g.moveTo(x, y)
        const a = r() * Math.PI
        g.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30)
        g.stroke()
      }
      // espaldar de uma poltrona, à direita
      g.filter = 'blur(6px)'
      g.fillStyle = '#4a2420'
      g.beginPath()
      g.ellipse(X(0.72), Y(0.62), X(0.22), Y(0.24), -0.1, 0, Math.PI * 2)
      g.fill()
      g.filter = 'blur(2px)'
      // corpo: casaco escuro
      g.fillStyle = '#151417'
      g.beginPath()
      g.moveTo(X(0.06), Y(1))
      g.bezierCurveTo(X(0.08), Y(0.78), X(0.18), Y(0.66), X(0.34), Y(0.625))
      g.bezierCurveTo(X(0.42), Y(0.6), X(0.46), Y(0.585), X(0.5), Y(0.585))
      g.bezierCurveTo(X(0.56), Y(0.585), X(0.62), Y(0.6), X(0.7), Y(0.625))
      g.bezierCurveTo(X(0.84), Y(0.66), X(0.93), Y(0.78), X(0.95), Y(1))
      g.closePath()
      g.fill()
      // luz no ombro esquerdo
      const om = g.createRadialGradient(X(0.26), Y(0.68), 4, X(0.26), Y(0.68), X(0.2))
      om.addColorStop(0, 'rgba(90,86,92,0.45)')
      om.addColorStop(1, 'rgba(90,86,92,0)')
      g.fillStyle = om
      g.fillRect(0, Y(0.58), w, Y(0.42))
      // gola branca
      g.fillStyle = '#d9d3c4'
      g.beginPath()
      g.moveTo(X(0.445), Y(0.585))
      g.lineTo(X(0.5), Y(0.66))
      g.lineTo(X(0.555), Y(0.585))
      g.closePath()
      g.fill()
      // pescoço
      const pesc = g.createLinearGradient(X(0.44), 0, X(0.56), 0)
      pesc.addColorStop(0, '#c49a7d')
      pesc.addColorStop(1, '#7e5a46')
      g.fillStyle = pesc
      g.fillRect(X(0.452), Y(0.5), X(0.096), Y(0.095))
      // orelhas
      g.fillStyle = '#b48a70'
      g.beginPath()
      g.ellipse(X(0.372), Y(0.415), X(0.018), Y(0.03), 0, 0, Math.PI * 2)
      g.ellipse(X(0.628), Y(0.415), X(0.016), Y(0.028), 0, 0, Math.PI * 2)
      g.fill()
      // rosto
      const rosto = g.createLinearGradient(X(0.37), 0, X(0.63), 0)
      rosto.addColorStop(0, '#e6c8ad')
      rosto.addColorStop(0.45, '#d4ae92')
      rosto.addColorStop(0.75, '#a77c63')
      rosto.addColorStop(1, '#7a5644')
      g.fillStyle = rosto
      g.beginPath()
      g.moveTo(X(0.5), Y(0.248))
      g.bezierCurveTo(X(0.585), Y(0.248), X(0.632), Y(0.31), X(0.63), Y(0.4))
      g.bezierCurveTo(X(0.628), Y(0.47), X(0.585), Y(0.54), X(0.5), Y(0.556))
      g.bezierCurveTo(X(0.415), Y(0.54), X(0.372), Y(0.47), X(0.37), Y(0.4))
      g.bezierCurveTo(X(0.368), Y(0.31), X(0.415), Y(0.248), X(0.5), Y(0.248))
      g.fill()
      // luz na testa e na maçã do rosto esquerda
      g.filter = 'blur(10px)'
      g.fillStyle = 'rgba(245,222,198,0.55)'
      g.beginPath()
      g.ellipse(X(0.46), Y(0.31), X(0.06), Y(0.03), 0, 0, Math.PI * 2)
      g.ellipse(X(0.43), Y(0.45), X(0.03), Y(0.022), 0, 0, Math.PI * 2)
      g.fill()
      // sombra do maxilar à direita
      g.fillStyle = 'rgba(70,44,34,0.45)'
      g.beginPath()
      g.ellipse(X(0.6), Y(0.47), X(0.03), Y(0.07), 0.2, 0, Math.PI * 2)
      g.fill()
      // órbitas
      g.filter = 'blur(7px)'
      g.fillStyle = 'rgba(96,62,46,0.42)'
      for (const u of [0.445, 0.555]) {
        g.beginPath()
        g.ellipse(X(u), Y(0.388), X(0.038), Y(0.016), 0, 0, Math.PI * 2)
        g.fill()
      }
      // sobrancelhas
      g.filter = 'blur(2.2px)'
      g.strokeStyle = 'rgba(52,36,28,0.85)'
      g.lineWidth = Y(0.006)
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(X(0.412), Y(0.372))
      g.quadraticCurveTo(X(0.445), Y(0.362), X(0.476), Y(0.37))
      g.moveTo(X(0.524), Y(0.37))
      g.quadraticCurveTo(X(0.555), Y(0.362), X(0.588), Y(0.373))
      g.stroke()
      // nariz
      g.filter = 'blur(3px)'
      g.strokeStyle = 'rgba(110,72,54,0.55)'
      g.lineWidth = Y(0.006)
      g.beginPath()
      g.moveTo(X(0.512), Y(0.4))
      g.quadraticCurveTo(X(0.522), Y(0.44), X(0.52), Y(0.462))
      g.stroke()
      g.fillStyle = 'rgba(80,48,36,0.6)'
      g.beginPath()
      g.ellipse(X(0.488), Y(0.468), X(0.008), Y(0.004), 0, 0, Math.PI * 2)
      g.ellipse(X(0.514), Y(0.468), X(0.008), Y(0.004), 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = 'rgba(240,214,190,0.45)'
      g.beginPath()
      g.ellipse(X(0.497), Y(0.455), X(0.008), Y(0.006), 0, 0, Math.PI * 2)
      g.fill()
      // boca
      g.filter = 'blur(1.6px)'
      g.fillStyle = '#8a5546'
      g.beginPath()
      g.moveTo(X(0.468), Y(0.505))
      g.quadraticCurveTo(X(0.5), Y(0.497), X(0.532), Y(0.505))
      g.quadraticCurveTo(X(0.5), Y(0.522), X(0.468), Y(0.505))
      g.fill()
      g.strokeStyle = 'rgba(60,32,26,0.8)'
      g.lineWidth = Y(0.0025)
      g.beginPath()
      g.moveTo(X(0.47), Y(0.5055))
      g.quadraticCurveTo(X(0.5), Y(0.509), X(0.53), Y(0.5055))
      g.stroke()
      // cabelo, preso para trás
      g.filter = 'blur(2px)'
      g.fillStyle = '#26201b'
      g.beginPath()
      g.moveTo(X(0.36), Y(0.43))
      g.bezierCurveTo(X(0.34), Y(0.3), X(0.4), Y(0.215), X(0.5), Y(0.215))
      g.bezierCurveTo(X(0.6), Y(0.215), X(0.66), Y(0.3), X(0.642), Y(0.43))
      g.bezierCurveTo(X(0.63), Y(0.36), X(0.6), Y(0.3), X(0.5), Y(0.29))
      g.bezierCurveTo(X(0.42), Y(0.3), X(0.375), Y(0.35), X(0.36), Y(0.43))
      g.fill()
      g.beginPath()
      g.arc(X(0.63), Y(0.255), X(0.05), 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = 'rgba(120,100,80,0.25)'
      g.lineWidth = 2
      for (let i = 0; i < 40; i++) {
        g.beginPath()
        const a0 = 0.38 + r() * 0.24
        g.moveTo(X(a0), Y(0.29))
        g.quadraticCurveTo(X(0.5), Y(0.2), X(0.62 + r() * 0.02), Y(0.25 + r() * 0.03))
        g.stroke()
      }
      g.filter = 'none'
      // verniz envelhecido e vinheta
      const vin = g.createRadialGradient(w / 2, h * 0.45, w * 0.3, w / 2, h * 0.5, w * 0.85)
      vin.addColorStop(0, 'rgba(0,0,0,0)')
      vin.addColorStop(1, 'rgba(10,8,4,0.55)')
      g.fillStyle = vin
      g.fillRect(0, 0, w, h)
      g.fillStyle = 'rgba(120,96,40,0.08)'
      g.fillRect(0, 0, w, h)
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '255,250,230' : '0,0,0'},${0.03 + r() * 0.03})`
        g.fillRect(r() * w, r() * h, 1.5, 1.5)
      }
    },
    1,
  )
}

/** 005 — A Pintura */
function pintura(c: Contexto): Peca {
  const W = 1.1
  const H = 1.42
  const cy = 2.05
  const cz = -32.96
  const u = { uOlhar: { value: new THREE.Vector2() } }
  const mat = new THREE.MeshStandardMaterial({ map: retrato(), roughness: 0.62 })
  mat.onBeforeCompile = (s) => {
    s.uniforms.uOlhar = u.uOlhar
    s.fragmentShader = s.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec2 uOlhar;
        vec3 olho(vec3 base, vec2 p, vec2 c0) {
          vec2 d = p - c0;
          float hw = 0.027;
          float a = clamp(d.x / hw, -1.2, 1.2);
          float aberta = 0.0104 * (1.0 - a * a);
          float cima = aberta * 1.0;
          float baixo = aberta * 0.72;
          float dentro = step(abs(a), 1.0) * smoothstep(-0.0009, 0.0006, min(cima - d.y, d.y + baixo));
          vec2 ic = c0 + uOlhar * vec2(0.0118, 0.0036);
          float ir = length(p - ic);
          vec3 esclera = vec3(0.74, 0.69, 0.62);
          vec3 cor = esclera * (0.72 + 0.28 * smoothstep(-baixo, cima * 0.4, -d.y + cima * 0.2));
          cor = mix(cor, vec3(0.22, 0.15, 0.1), smoothstep(0.0101, 0.0092, ir));
          cor = mix(cor, vec3(0.13, 0.085, 0.06), smoothstep(0.0062, 0.0034, ir) * 0.6);
          cor = mix(cor, vec3(0.02), smoothstep(0.0042, 0.0034, ir));
          cor += vec3(0.42) * smoothstep(0.0014, 0.0005, length(p - ic - vec2(-0.0024, 0.0024)));
          // sombra da pálpebra de cima
          cor *= 0.62 + 0.38 * smoothstep(cima, cima - 0.006, d.y);
          vec3 r = mix(base, cor, dentro);
          // linha da pálpebra
          float linha = step(abs(a), 1.05) * smoothstep(0.0016, 0.0, abs(d.y - cima)) * (1.0 - smoothstep(0.85, 1.05, abs(a)));
          return mix(r, vec3(0.16, 0.1, 0.08), linha * 0.85);
        }`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          vec2 p = vMapUv * vec2(${W.toFixed(3)}, ${H.toFixed(3)});
          float yo = (1.0 - 0.3946) * ${H.toFixed(3)};
          diffuseColor.rgb = olho(diffuseColor.rgb, p, vec2(0.445 * ${W.toFixed(3)}, yo));
          diffuseColor.rgb = olho(diffuseColor.rgb, p, vec2(0.555 * ${W.toFixed(3)}, yo));
        }`,
      )
  }
  mat.customProgramCacheKey = () => 'pintura-olhos'
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat)
  tela.position.set(24, cy, cz + 0.045)
  tela.receiveShadow = true
  c.cena.add(tela)
  // moldura de nogueira com filete dourado
  const nog = new THREE.MeshStandardMaterial({ color: '#2b1d15', roughness: 0.55 })
  const ouro = new THREE.MeshStandardMaterial({ color: '#9c7b45', metalness: 0.9, roughness: 0.35 })
  const m = 0.09
  for (const [w, h, x, y] of [
    [W + m * 2, m, 24, cy + H / 2 + m / 2],
    [W + m * 2, m, 24, cy - H / 2 - m / 2],
    [m, H, 24 - W / 2 - m / 2, cy],
    [m, H, 24 + W / 2 + m / 2, cy],
  ])
    c.cena.add(caixa(w, h, 0.08, nog, x, y, cz + 0.04))
  for (const [w, h, x, y] of [
    [W + 0.02, 0.012, 24, cy + H / 2 + 0.006],
    [W + 0.02, 0.012, 24, cy - H / 2 - 0.006],
    [0.012, H, 24 - W / 2 - 0.006, cy],
    [0.012, H, 24 + W / 2 + 0.006, cy],
  ])
    c.cena.add(caixa(w, h, 0.09, ouro, x, y, cz + 0.045))
  placaObra(c, '005', [25.05 + 0.21, 1.45, cz + 0.005], 0)
  alvo(c, { objetos: [tela], tipo: () => 'obra', rotulo: () => tr('observar'), distancia: 16, acao: () => c.irParaPonto('obra-005') })

  const olhos = new THREE.Vector3(24, cy + (0.5 - 0.3946) * H, cz)
  const espelhoPos = new THREE.Vector3(33, 1.75, -21)
  const alvoO = new THREE.Vector2()
  let proxSacada = 0
  let observando = 0
  let desviando = false
  const r = sorteio(5)
  const dirPara = (p: THREE.Vector3, out: THREE.Vector2) => {
    const dx = p.x - olhos.x
    const dy = p.y - olhos.y
    const dz = Math.max(0.2, p.z - olhos.z)
    out.set(THREE.MathUtils.clamp(Math.atan2(dx, dz) / 0.72, -1, 1), THREE.MathUtils.clamp(Math.atan2(dy, Math.hypot(dx, dz)) / 0.55, -1, 1))
    return out
  }
  const tmp = new THREE.Vector2()
  return {
    atualizar(dt, cx) {
      const naSala = cx.sala() === 'g04'
      if (!naSala) return
      const olha = cx.olhando(olhos, 0.24, 12)
      if (olha) observando += dt
      const t = cx.tempo()
      if (t > proxSacada) {
        // os olhos se movem aos saltos, como olhos de verdade
        proxSacada = t + 0.25 + r() * 0.55
        if (!memoria.pinturaDesviou && observando > 7 && olha && !desviando) {
          desviando = true
          mudarMemoria({ pinturaDesviou: true })
          cx.descobrir('anomalia', '005')
        }
        if (memoria.pinturaDesviou) dirPara(espelhoPos, alvoO)
        else alvoO.copy(dirPara(cx.camera.position, tmp))
        alvoO.x += (r() - 0.5) * 0.06
        alvoO.y += (r() - 0.5) * 0.04
      }
      u.uOlhar.value.lerp(alvoO, 1 - Math.exp(-dt * 26))
      if (observando > 20) cx.descobrir('segredo', 'pintura', tr('notaEncontrada'))
    },
  }
}

export function criarG04(c: Contexto): Peca {
  const e = espelho(c)
  const p = pintura(c)
  return {
    atualizar(dt, cx) {
      e.atualizar?.(dt, cx)
      p.atualizar?.(dt, cx)
    },
  }
}
