// Galeria 03 — O Tempo, Interrompido: O Relógio (003), que às vezes volta um segundo, e
// A Janela (007), onde é sempre fim de tarde.
import * as THREE from 'three'
import { tr } from '../../content/textos'
import { som } from '../../core/som'
import { ACENTO, canvasTexto, sorteio } from '../base'
import { alvo, caixa, folha, placaObra, sombraContato, type Contexto, type Peca } from './comum'

function mostrador() {
  return canvasTexto(
    1024,
    1024,
    (g, w) => {
      const c = w / 2
      g.fillStyle = '#f3f2ee'
      g.beginPath()
      g.arc(c, c, c, 0, Math.PI * 2)
      g.fill()
      // leve sombra da borda sobre o esmalte
      const gr = g.createRadialGradient(c, c, c * 0.82, c, c, c)
      gr.addColorStop(0, 'rgba(0,0,0,0)')
      gr.addColorStop(1, 'rgba(0,0,0,0.12)')
      g.fillStyle = gr
      g.fillRect(0, 0, w, w)
      g.fillStyle = '#121212'
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2
        const hora = i % 5 === 0
        const comp = hora ? c * 0.2 : c * 0.06
        const larg = hora ? c * 0.055 : c * 0.016
        g.save()
        g.translate(c, c)
        g.rotate(a)
        g.fillRect(-larg / 2, -c * 0.93, larg, comp)
        g.restore()
      }
    },
    1,
  )
}

/** 003 — O Relógio */
function relogio(c: Contexto): Peca {
  const g = new THREE.Group()
  g.position.set(32.98, 3.4, 0)
  g.rotation.y = -Math.PI / 2
  c.cena.add(g)
  const caixaR = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.14, 96), c.mats.acoClaro)
  caixaR.rotation.x = Math.PI / 2
  caixaR.position.z = 0.07
  caixaR.castShadow = true
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.035, 16, 96), c.mats.acoClaro)
  aro.position.z = 0.145
  const disco = new THREE.Mesh(new THREE.CircleGeometry(0.79, 96), new THREE.MeshStandardMaterial({ map: mostrador(), roughness: 0.32 }))
  disco.position.z = 0.142
  const vidro = new THREE.Mesh(new THREE.CircleGeometry(0.79, 64), c.mats.vidro)
  vidro.position.z = 0.17
  g.add(caixaR, aro, disco, vidro)
  const preto = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.5 })
  const ponteiro = (w: number, l: number, cauda: number, m: THREE.Material, z: number) => {
    const p = new THREE.Group()
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, l + cauda, 0.008), m)
    b.position.y = (l - cauda) / 2
    b.castShadow = true
    p.add(b)
    p.position.z = z
    g.add(p)
    return p
  }
  const hora = ponteiro(0.06, 0.48, 0.12, preto, 0.152)
  const minuto = ponteiro(0.045, 0.7, 0.14, preto, 0.158)
  const acento = new THREE.MeshStandardMaterial({ color: ACENTO, roughness: 0.45 })
  const segundo = ponteiro(0.011, 0.66, 0.2, acento, 0.164)
  const eixo = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 24), acento)
  eixo.rotation.x = Math.PI / 2
  eixo.position.z = 0.166
  g.add(eixo)
  c.cena.add(sombraContato(1.2, 0.5, 0.25, 32.6, 0, 0.004))
  placaObra(c, '003', [32.985, 1.45, -1.55], -Math.PI / 2)

  const centro = new THREE.Vector3(33, 3.4, 0)
  let ultimoSeg = -1
  let mostrado = 0
  let anterior = 0
  let desde = 10
  let atraso = 0
  let observando = 0
  let semOlhar = 0
  let proxima = 0
  const r = sorteio(Date.now() % 1000)
  return {
    atualizar(dt, cx) {
      const agora = new Date()
      const s = agora.getSeconds()
      const m = agora.getMinutes() + s / 60
      const h = (agora.getHours() % 12) + m / 60
      hora.rotation.z = -(h / 12) * Math.PI * 2
      minuto.rotation.z = -(Math.floor(m) / 60) * Math.PI * 2
      const naSala = cx.sala() === 'g03'
      const olha = naSala && cx.olhando(centro, 0.22, 14)
      if (olha) {
        observando += dt
        semOlhar = 0
      } else {
        semOlhar += dt
        if (semOlhar > 1.5) {
          // quando ninguém está olhando, ele volta a marcar a hora certa
          atraso = 0
          observando = Math.max(0, observando - dt * 2)
        }
      }
      if (s !== ultimoSeg) {
        ultimoSeg = s
        let reverso = false
        // o passo para trás: o ponteiro volta uma posição e segue dali, dois segundos atrasado
        if (olha && observando > 4.5 && cx.tempo() > proxima && atraso < 6) {
          atraso += 2
          reverso = true
          proxima = cx.tempo() + 9 + r() * 6
          cx.descobrir('anomalia', '003')
        }
        anterior = mostrado
        mostrado = s - atraso
        desde = 0
        if (naSala) som.tique(reverso, cx.camera.position.distanceTo(centro))
      }
      desde += dt
      // o ponteiro salta e assenta, com uma pequena sobra
      const k = Math.min(1, desde / 0.09)
      const ease = k < 1 ? 1 - Math.pow(1 - k, 3) * Math.cos(k * 4) : 1
      const sobra = desde < 0.35 ? Math.sin(desde * 40) * Math.exp(-desde * 16) * 0.012 : 0
      let de = anterior
      let ate = mostrado
      if (ate - de > 30) de += 60
      if (de - ate > 30) ate += 60
      const v = de + (ate - de) * ease
      segundo.rotation.z = -(v / 60) * Math.PI * 2 - sobra
    },
  }
}

/** 007 — A Janela: um jardim ao entardecer, em camadas, atrás de um caixilho de bronze */
function janela(c: Contexto) {
  const x0 = 19.9
  const x1 = 24.1
  const y0 = 0.85
  const y1 = 3.5
  const zc = 8.2
  const bronze = new THREE.MeshStandardMaterial({ color: '#5e4c36', metalness: 0.75, roughness: 0.42 })
  const g = new THREE.Group()
  const perfil = (w: number, h: number, x: number, y: number) => g.add(caixa(w, h, 0.12, bronze, x, y, zc))
  const xm = (x0 + x1) / 2
  perfil(x1 - x0, 0.07, xm, y0 + 0.035)
  perfil(x1 - x0, 0.07, xm, y1 - 0.035)
  perfil(0.07, y1 - y0, x0 + 0.035, (y0 + y1) / 2)
  perfil(0.07, y1 - y0, x1 - 0.035, (y0 + y1) / 2)
  perfil(0.045, y1 - y0, x0 + (x1 - x0) / 3, (y0 + y1) / 2)
  perfil(0.045, y1 - y0, x0 + ((x1 - x0) * 2) / 3, (y0 + y1) / 2)
  perfil(x1 - x0, 0.045, xm, y0 + (y1 - y0) * 0.72)
  // peitoril de pedra
  g.add(caixa(x1 - x0 + 0.2, 0.05, 0.32, c.mats.travertino, xm, y0 - 0.02, zc - 0.12))
  const vidro = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), c.mats.vidro)
  vidro.position.set(xm, (y0 + y1) / 2, zc)
  vidro.rotation.y = Math.PI
  g.add(vidro)
  c.cena.add(g)

  // a caixa do jardim, fechada (de fora, parece um volume de concreto da fachada)
  const cx0 = 16.5
  const cx1 = 27.5
  const zf = 11.25
  const caixas = [
    caixa(cx1 - cx0 + 0.4, 4.3, 0.2, c.mats.forma, (cx0 + cx1) / 2, 2.0, zf + 0.1),
    caixa(0.2, 4.3, zf - 8.4, c.mats.forma, cx0 - 0.1, 2.0, (8.4 + zf) / 2),
    caixa(0.2, 4.3, zf - 8.4, c.mats.forma, cx1 + 0.1, 2.0, (8.4 + zf) / 2),
    caixa(cx1 - cx0 + 0.4, 0.25, zf - 8.4 + 0.2, c.mats.forma, (cx0 + cx1) / 2, 4.2, (8.4 + zf) / 2),
  ]
  caixas.forEach((b) => c.cena.add(b))
  c.mundo.blocos.push({ x0: cx0 - 0.2, x1: cx1 + 0.2, z0: 8.4, z1: zf + 0.2 })
  // grama
  const grama = new THREE.Mesh(new THREE.PlaneGeometry(cx1 - cx0, zf - 8.4), new THREE.MeshStandardMaterial({ color: '#2b3122', roughness: 1 }))
  grama.rotation.x = -Math.PI / 2
  grama.position.set((cx0 + cx1) / 2, 0.02, (8.4 + zf) / 2)
  grama.receiveShadow = true
  c.cena.add(grama)

  const r = sorteio(1942)
  // o céu do fim de tarde (sem iluminação: é ele que ilumina)
  const ceu = canvasTexto(
    1100,
    440,
    (q, w, h) => {
      const gr = q.createLinearGradient(0, 0, 0, h)
      gr.addColorStop(0, '#263450')
      gr.addColorStop(0.3, '#5b5a76')
      gr.addColorStop(0.52, '#c47a6c')
      gr.addColorStop(0.66, '#f0a05e')
      gr.addColorStop(0.78, '#ffd497')
      gr.addColorStop(1, '#ffe6c0')
      q.fillStyle = gr
      q.fillRect(0, 0, w, h)
      // brilho do sol, à direita (oeste)
      const sol = q.createRadialGradient(w * 0.66, h * 0.8, 2, w * 0.66, h * 0.8, w * 0.3)
      sol.addColorStop(0, 'rgba(255,242,205,1)')
      sol.addColorStop(0.07, 'rgba(255,216,150,0.85)')
      sol.addColorStop(1, 'rgba(255,170,90,0)')
      q.fillStyle = sol
      q.fillRect(0, 0, w, h)
      for (let i = 0; i < 22; i++) {
        const y = h * (0.12 + r() * 0.42)
        q.fillStyle = `rgba(${200 + r() * 55},${130 + r() * 60},${120 + r() * 40},${0.1 + r() * 0.14})`
        q.beginPath()
        q.ellipse(r() * w, y, w * (0.06 + r() * 0.14), h * (0.008 + r() * 0.012), 0, 0, Math.PI * 2)
        q.fill()
      }
      // colinas e copas ao longe, em névoa
      q.fillStyle = 'rgba(92,70,84,0.85)'
      q.beginPath()
      q.moveTo(0, h)
      for (let x = 0; x <= w; x += 5) q.lineTo(x, h * 0.8 - (Math.sin(x * 0.008) * 0.5 + 0.5) * h * 0.05 - r() * h * 0.025)
      q.lineTo(w, h)
      q.fill()
      q.fillStyle = 'rgba(60,46,56,0.95)'
      q.beginPath()
      q.moveTo(0, h)
      for (let x = 0; x <= w; x += 4) q.lineTo(x, h * 0.86 - r() * h * 0.035 - (Math.sin(x * 0.02 + 2) * 0.5 + 0.5) * h * 0.03)
      q.lineTo(w, h)
      q.fill()
    },
    1,
  )
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(cx1 - cx0, 4.4), new THREE.MeshBasicMaterial({ map: ceu, toneMapped: false, fog: false }))
  fundo.position.set((cx0 + cx1) / 2, 1.9, zf - 0.02)
  fundo.rotation.y = Math.PI
  c.cena.add(fundo)

  // silhuetas recortadas: árvores, um poste com a lâmpada acesa, a sebe
  const silhueta = (w: number, h: number, desenhar: (q: CanvasRenderingContext2D, W: number, H: number) => void, z: number, y: number, cor: string) => {
    const t = canvasTexto(w * 130, h * 130, desenhar, 1)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, color: cor, roughness: 1, side: THREE.DoubleSide }))
    m.position.set((cx0 + cx1) / 2, y, z)
    m.rotation.y = Math.PI
    m.castShadow = true
    c.cena.add(m)
    return m
  }
  /** copa feita de muitos tufos pequenos, com galhos aparecendo */
  const arvore = (q: CanvasRenderingContext2D, H: number, x: number, alt: number, larg: number) => {
    const topo = H - alt * H
    q.lineCap = 'round'
    q.strokeStyle = '#fff'
    q.lineWidth = Math.max(3, larg * 0.05)
    q.beginPath()
    q.moveTo(x, H)
    q.quadraticCurveTo(x - larg * 0.04, H - alt * H * 0.4, x + larg * 0.02, topo + alt * H * 0.35)
    q.stroke()
    for (let i = 0; i < 7; i++) {
      q.lineWidth = Math.max(1.5, larg * 0.018)
      q.beginPath()
      const yb = topo + alt * H * (0.35 + r() * 0.25)
      q.moveTo(x, yb)
      q.lineTo(x + (r() - 0.5) * larg * 0.9, yb - r() * alt * H * 0.3)
      q.stroke()
    }
    q.fillStyle = '#fff'
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2
      const rr = Math.sqrt(r())
      const cx = x + Math.cos(a) * rr * larg * 0.5
      const cy = topo + alt * H * 0.22 + Math.sin(a) * rr * alt * H * 0.24
      q.beginPath()
      q.arc(cx, cy, larg * (0.012 + r() * 0.03), 0, Math.PI * 2)
      q.fill()
    }
  }
  silhueta(
    cx1 - cx0,
    4.1,
    (q, W, H) => {
      q.clearRect(0, 0, W, H)
      arvore(q, H, W * 0.16, 0.72, W * 0.16)
      arvore(q, H, W * 0.47, 0.58, W * 0.12)
      arvore(q, H, W * 0.86, 0.66, W * 0.15)
      // poste
      q.fillStyle = '#fff'
      q.fillRect(W * 0.32 - 3, H * 0.48, 6, H * 0.52)
      q.fillRect(W * 0.32 - 12, H * 0.465, 24, 7)
    },
    10.4,
    1.8,
    '#18181a',
  )
  const lampada = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd28c').multiplyScalar(3) }))
  // o poste está a 32% da largura da silhueta (vista de costas): a lâmpada fica do lado espelhado
  lampada.position.set(cx1 - (cx1 - cx0) * 0.32, -0.25 + 4.1 * (1 - 0.465) + 0.06, 10.38)
  c.cena.add(lampada)
  silhueta(
    cx1 - cx0,
    1.5,
    (q, W, H) => {
      q.clearRect(0, 0, W, H)
      q.fillStyle = '#fff'
      for (let i = 0; i < 900; i++) {
        const x = r() * W
        const lado = x < W * 0.34 || x > W * 0.7
        const alt = lado ? 0.45 + r() * 0.5 : 0.12 + r() * 0.18
        q.beginPath()
        q.arc(x, H - r() * alt * H, W * (0.004 + r() * 0.01), 0, Math.PI * 2)
        q.fill()
      }
      q.fillRect(0, H * 0.9, W, H * 0.1)
    },
    9.3,
    0.72,
    '#121411',
  )
  placaObra(c, '007', [25.1, 1.45, 7.985], Math.PI)
}

function relatorio(c: Contexto) {
  const prancheta = new THREE.Group()
  const base = caixa(0.25, 0.006, 0.34, new THREE.MeshStandardMaterial({ color: '#8a6b4c', roughness: 0.7 }))
  const papel = folha(0.21, 0.29, { semente: 21 })
  papel.position.y = 0.005
  const clipe = caixa(0.09, 0.01, 0.025, c.mats.acoClaro, 0, 0.01, -0.15)
  prancheta.add(base, papel, clipe)
  prancheta.position.set(29.6, 1.12, -5.6)
  prancheta.rotation.set(0.32, -Math.PI / 2, 0, 'YXZ')
  c.cena.add(prancheta, sombraContato(0.7, 0.6, 0.45, 29.6, -5.6, 0.004))
  alvo(c, { objetos: [base, papel], tipo: () => 'documento', rotulo: () => tr('ler'), distancia: 4, acao: () => c.abrirDocumento('manutencao') })
}

export function criarG03(c: Contexto): Peca {
  const r = relogio(c)
  janela(c)
  relatorio(c)
  c.cena.add(sombraContato(3.0, 1.0, 0.45, 24.6, 0, 0.004))
  return r
}
