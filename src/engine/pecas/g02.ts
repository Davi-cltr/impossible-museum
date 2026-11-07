// Galeria 02 — A Memória dos Objetos: A Sala (004), que muda enquanto você não está;
// a sala de leitura com o livro que abre uma porta em outro lugar; o lugar da obra 014.
import * as THREE from 'three'
import { OBRA } from '../../content/acervo'
import { lt, tr } from '../../content/textos'
import { memoria, mudarMemoria, sabe } from '../../core/estado'
import { som } from '../../core/som'
import { canvasTexto, FONTE_SERIF, sorteio } from '../base'
import type { Bloco } from '../mundo'
import { desenharPlaca, letreiro } from '../mundo'
import { dentroSala004, SALA004 } from '../planta'
import { Porta } from '../portas'
import { alvo, caixa, folha, materiaisMoveis, placaObra, sombraContato, type Contexto, type MatsMoveis, type Peca } from './comum'

function cadeira(m: MatsMoveis) {
  const g = new THREE.Group()
  g.add(caixa(0.44, 0.035, 0.42, m.carvalho, 0, 0.455, 0))
  for (const [x, z] of [
    [-0.19, -0.18],
    [0.19, -0.18],
    [-0.19, 0.18],
    [0.19, 0.18],
  ])
    g.add(caixa(0.034, 0.45, 0.034, m.carvalho, x, 0.225, z))
  for (const x of [-0.19, 0.19]) g.add(caixa(0.034, 0.48, 0.034, m.carvalho, x, 0.7, 0.19))
  g.add(caixa(0.42, 0.1, 0.026, m.carvalho, 0, 0.9, 0.19))
  g.add(caixa(0.42, 0.04, 0.022, m.carvalho, 0, 0.66, 0.19))
  const s = sombraContato(0.75, 0.75, 0.5)
  g.add(s)
  return g
}

function mesa(m: MatsMoveis) {
  const g = new THREE.Group()
  g.add(caixa(1.1, 0.04, 0.72, m.carvalho, 0, 0.74, 0))
  g.add(caixa(0.98, 0.09, 0.6, m.carvalho, 0, 0.675, 0))
  for (const [x, z] of [
    [-0.5, -0.31],
    [0.5, -0.31],
    [-0.5, 0.31],
    [0.5, 0.31],
  ])
    g.add(caixa(0.05, 0.72, 0.05, m.carvalho, x, 0.36, z))
  g.add(sombraContato(1.5, 1.1, 0.55))
  return g
}

function xicara(m: MatsMoveis) {
  const g = new THREE.Group()
  const pires = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.01, 24), m.porcelana)
  pires.position.y = 0.005
  const x = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.07, 24), m.porcelana)
  x.position.y = 0.045
  g.add(pires, x)
  g.traverse((o) => (o.castShadow = true))
  return g
}

interface Arranjo {
  mesa: [number, number, number]
  c1: [number, number, number]
  c2: [number, number, number] | null
  xicaras: boolean
}

/** a disposição da sala depois de n mudanças (cada ausência muda uma coisa) */
function arranjo(n: number): Arranjo {
  const a: Arranjo = { mesa: [-4.4, -29.7, 0], c1: [-4.4, -29.0, 0], c2: null, xicaras: false }
  if (n >= 1) a.c1 = [-4.4, -29.0, 0.55]
  if (n >= 2) a.c1 = [-5.7, -28.2, Math.PI / 2 + 0.2]
  if (n >= 3) a.mesa = [-4.05, -29.75, 0.09]
  if (n >= 4) a.c2 = [-4.2, -30.5, Math.PI]
  if (n >= 5) a.xicaras = true
  if (n >= 6) a.c1 = [-3.6, -28.0, -Math.PI / 2 + 0.15]
  if (n >= 7) a.c2 = [-4.0, -30.35, -Math.PI / 2 + 0.3]
  if (n >= 8) {
    const r = sorteio(n * 31)
    a.c1 = [-3.6 + (r() - 0.5) * 0.3, -28.0 + (r() - 0.5) * 0.3, -Math.PI / 2 + (r() - 0.5) * 0.5]
  }
  return a
}

function tapete() {
  const tex = canvasTexto(
    440,
    320,
    (g, w, h) => {
      g.fillStyle = '#6a4636'
      g.fillRect(0, 0, w, h)
      g.strokeStyle = '#c9b48f'
      g.lineWidth = 6
      g.strokeRect(18, 18, w - 36, h - 36)
      g.strokeStyle = '#3d2a22'
      g.lineWidth = 10
      g.strokeRect(34, 34, w - 68, h - 68)
      g.fillStyle = '#8a5e44'
      for (let i = 0; i < 5; i++) {
        const x = w * (0.2 + i * 0.15)
        g.beginPath()
        g.moveTo(x, h * 0.3)
        g.lineTo(x + 18, h / 2)
        g.lineTo(x, h * 0.7)
        g.lineTo(x - 18, h / 2)
        g.closePath()
        g.fill()
      }
    },
    1,
  )
  const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }))
  p.rotation.x = -Math.PI / 2
  p.position.set(-4.4, 0.027, -29.4)
  p.receiveShadow = true
  return p
}

function quadroPequeno() {
  const tex = canvasTexto(
    250,
    200,
    (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h)
      gr.addColorStop(0, '#c8cdc6')
      gr.addColorStop(0.6, '#e2d9c4')
      gr.addColorStop(1, '#7d7a5f')
      g.fillStyle = gr
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#5f6450'
      g.beginPath()
      g.moveTo(0, h * 0.72)
      g.quadraticCurveTo(w * 0.4, h * 0.58, w, h * 0.7)
      g.lineTo(w, h)
      g.lineTo(0, h)
      g.fill()
    },
    1,
  )
  const g = new THREE.Group()
  g.add(caixa(0.52, 0.42, 0.03, new THREE.MeshStandardMaterial({ color: '#2c241e', roughness: 0.6 })))
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.34), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }))
  tela.position.z = 0.016
  g.add(tela)
  return g
}

/** 004 — A Sala */
function sala(c: Contexto, m: MatsMoveis) {
  const g = new THREE.Group()
  c.cena.add(g)
  const t = mesa(m)
  const c1 = cadeira(m)
  const c2 = cadeira(m)
  const xs = new THREE.Group()
  const x1 = xicara(m)
  x1.position.set(-0.25, 0.76, 0.12)
  const x2 = xicara(m)
  x2.position.set(0.22, 0.76, -0.14)
  xs.add(x1, x2)
  t.add(xs)
  g.add(t, c1, c2, tapete())
  // armário baixo, luminária pendente, quadro, cortinas
  const armario = caixa(0.8, 0.82, 0.4, m.nogueira, -2.75, 0.41, -30.98)
  g.add(armario, sombraContato(1.1, 0.7, 0.5, -2.75, -30.95, 0.03))
  const fio = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.55, 6), m.ferro)
  fio.position.set(-4.4, 2.92, -29.6)
  const cupula = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.9, side: THREE.DoubleSide, emissive: '#ffcf8a', emissiveIntensity: 0.35 }))
  cupula.position.set(-4.4, 2.55, -29.6)
  g.add(fio, cupula)
  const q = quadroPequeno()
  q.position.set(-4.6, 1.62, SALA004.z1 - 0.03)
  q.rotation.y = Math.PI
  g.add(q)
  for (const dz of [-0.82, 0.82]) {
    const cortina = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.0, 1, 1), new THREE.MeshStandardMaterial({ color: '#d9d2c3', roughness: 0.95, side: THREE.DoubleSide }))
    cortina.position.set(SALA004.x0 + 0.06, 1.55, -28.8 + dz)
    cortina.rotation.y = Math.PI / 2
    g.add(cortina)
  }
  // colisões que acompanham os móveis
  const bMesa: Bloco = { x0: 0, x1: 0, z0: 0, z1: 0, ativo: () => true, baixo: true }
  const bC1: Bloco = { x0: 0, x1: 0, z0: 0, z1: 0, ativo: () => true, baixo: true }
  const bC2: Bloco = { x0: 0, x1: 0, z0: 0, z1: 0, ativo: () => c2.visible, baixo: true }
  c.mundo.blocos.push(bMesa, bC1, bC2, { x0: -3.15, x1: -2.35, z0: -31.2, z1: -30.78, baixo: true })
  const caixaBloco = (b: Bloco, x: number, z: number, hx: number, hz: number) => {
    b.x0 = x - hx
    b.x1 = x + hx
    b.z0 = z - hz
    b.z1 = z + hz
  }
  const aplicar = (n: number) => {
    const a = arranjo(n)
    t.position.set(a.mesa[0], 0.024, a.mesa[1])
    t.rotation.y = a.mesa[2]
    c1.position.set(a.c1[0], 0.024, a.c1[1])
    c1.rotation.y = a.c1[2]
    c2.visible = a.c2 !== null
    if (a.c2) {
      c2.position.set(a.c2[0], 0.024, a.c2[1])
      c2.rotation.y = a.c2[2]
    }
    xs.visible = a.xicaras
    caixaBloco(bMesa, a.mesa[0], a.mesa[1], 0.56, 0.4)
    caixaBloco(bC1, a.c1[0], a.c1[1], 0.24, 0.24)
    if (a.c2) caixaBloco(bC2, a.c2[0], a.c2[1], 0.24, 0.24)
  }
  aplicar(memoria.sala004)

  // a porta da sala, de madeira, aberta para dentro
  const porta = new Porta({
    id: 'sala004',
    tipo: 'giro',
    eixo: 'z',
    centro: [SALA004.x1 + 0.09, -28.8],
    largura: 1.2,
    altura: 2.2,
    espessura: 0.045,
    folha: m.porta,
    quadro: c.mats.latao,
    som: 'madeira',
    aberta: true,
    dobradica: 1,
    abrePara: -1,
  })
  porta.aoMover = (abrindo) => som.porta('madeira', abrindo)
  c.portas.sala004 = porta
  c.cena.add(porta.grupo)
  c.mundo.blocos.push(porta.bloco)
  alvo(c, {
    objetos: porta.alvos,
    tipo: () => 'porta',
    rotulo: () => (porta.alvo > 0.5 ? tr('fecharPorta') : tr('abrir')),
    distancia: 4,
    acao: () => porta.alternar(),
  })
  placaObra(c, '004', [SALA004.x1 + 0.19, 1.45, -27.55], -Math.PI / 2 + Math.PI)

  let dentro = false
  let entrou = false
  let foraDesde = 0
  let mudou = false
  const portaPos = new THREE.Vector3(SALA004.x1, 1.2, -28.8)
  return {
    atualizar(_dt: number, cx: Contexto) {
      const p = cx.jogador.pos
      const d = dentroSala004(p.x, p.z)
      if (d && !dentro) {
        if (mudou && memoria.sala004 >= 1) cx.descobrir('anomalia', '004')
        mudou = false
        entrou = true
      }
      if (!d && dentro) foraDesde = cx.tempo()
      dentro = d
      if (d || !entrou || mudou) return
      if (cx.tempo() - foraDesde < 2.5) return
      // não muda enquanto o visitante pode ver o interior pela porta
      const perto = Math.hypot(p.x - portaPos.x, p.z - portaPos.z) < 3.2
      const vendo = cx.sala() === 'g02' && porta.abertura > 0.1 && cx.olhando(portaPos, 0.75, 13)
      if (perto || vendo) return
      mudarMemoria({ sala004: memoria.sala004 + 1 })
      aplicar(memoria.sala004)
      mudou = true
    },
  } satisfies Peca
}

/** a sala de leitura: a estante, o livro que se puxa e o livro de tombo sobre a mesa */
function leitura(c: Contexto, m: MatsMoveis) {
  const estante = new THREE.Group()
  const mat = c.mats.nogueira
  const x0 = 1.4
  const x1 = 6.6
  const zf = -32.56
  const zt = -33
  const prof = zf - zt
  estante.add(caixa(x1 - x0, 2.5, 0.02, mat, (x0 + x1) / 2, 1.25, zt + 0.01))
  for (const x of [x0 + 0.015, x1 - 0.015, (x0 + x1) / 2]) estante.add(caixa(0.03, 2.5, prof, mat, x, 1.25, (zf + zt) / 2))
  const prateleiras = [0.06, 0.56, 1.06, 1.56, 2.06, 2.485]
  for (const y of prateleiras) estante.add(caixa(x1 - x0, 0.03, prof, mat, (x0 + x1) / 2, y, (zf + zt) / 2))
  c.cena.add(estante)
  // livros: uma malha instanciada
  const r = sorteio(1974)
  const cores = ['#5b2a26', '#2e3b4e', '#7d6a43', '#3e3e3a', '#d8cfb8', '#1f1f1f', '#6e3f2c', '#41503f', '#8c8577', '#2b2622']
  const geo = new THREE.BoxGeometry(1, 1, 1)
  geo.translate(0, 0.5, 0)
  const livros = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.75 }), 360)
  livros.castShadow = livros.receiveShadow = true
  const mtx = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const cor = new THREE.Color()
  let n = 0
  const especial = { x: 4.62, prateleira: 3 }
  for (let pi = 0; pi < 5; pi++) {
    const yb = prateleiras[pi] + 0.015
    const vao = prateleiras[pi + 1] - yb - 0.03
    for (const [a, b] of [
      [x0 + 0.04, (x0 + x1) / 2 - 0.02],
      [(x0 + x1) / 2 + 0.02, x1 - 0.04],
    ]) {
      let x = a + r() * 0.05
      while (x < b - 0.07 && n < 360) {
        if (r() < 0.05) {
          x += 0.08 + r() * 0.2
          continue
        }
        const w = 0.022 + r() * 0.045
        if (pi === especial.prateleira && Math.abs(x + w / 2 - especial.x) < 0.07) {
          x += 0.1
          continue
        }
        const h = Math.min(vao, 0.2 + r() * 0.2)
        const d = 0.16 + r() * 0.08
        const inclina = r() < 0.04 ? (r() - 0.5) * 0.3 : 0
        q.setFromEuler(new THREE.Euler(0, 0, inclina))
        mtx.compose(new THREE.Vector3(x + w / 2, yb, zf - d / 2 - 0.012), q, new THREE.Vector3(w, h, d))
        livros.setMatrixAt(n, mtx)
        cor.set(cores[Math.floor(r() * cores.length)]).multiplyScalar(0.8 + r() * 0.35)
        livros.setColorAt(n, cor)
        n++
        x += w + 0.002
      }
    }
  }
  livros.count = n
  c.cena.add(livros)

  // o livro que se puxa: verde-escuro, com um filete dourado
  const lombada = canvasTexto(
    60,
    340,
    (g, w, h) => {
      g.fillStyle = '#23352c'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#b89a62'
      g.fillRect(0, h * 0.12, w, 3)
      g.fillRect(0, h * 0.86, w, 3)
      g.save()
      g.translate(w / 2 + 6, h / 2)
      g.rotate(-Math.PI / 2)
      g.font = `italic 400 22px ${FONTE_SERIF}`
      g.textAlign = 'center'
      g.fillText('Catalogue', 0, 0)
      g.restore()
    },
    1,
  )
  const matLivro = new THREE.MeshStandardMaterial({ color: '#23352c', roughness: 0.6 })
  const livro = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.23), [matLivro, matLivro, matLivro, matLivro, new THREE.MeshStandardMaterial({ map: lombada, roughness: 0.55 }), matLivro])
  livro.geometry.translate(0, 0.17, -0.115)
  livro.castShadow = true
  const pivo = new THREE.Group()
  pivo.position.set(especial.x, prateleiras[especial.prateleira] + 0.015, zf - 0.012)
  pivo.add(livro)
  c.cena.add(pivo)
  let puxado = sabe('segredos', 'livro')
  let anim = puxado ? 1 : 0
  alvo(c, {
    objetos: [livro],
    tipo: () => 'objeto',
    rotulo: () => tr('puxar'),
    distancia: 6,
    ativo: () => !puxado,
    acao: () => {
      if (puxado) return
      puxado = true
      som.livro()
      setTimeout(() => {
        som.trinco()
        c.descobrir('segredo', 'livro', tr('livroPuxado'))
        if (c.portas['014']) c.portas['014'].trancada = false
      }, 900)
    },
  })

  // o livro de tombo, aberto sobre a mesa
  const paginas = canvasTexto(
    620,
    440,
    (g, w, h) => {
      g.fillStyle = '#efe7d4'
      g.fillRect(0, 0, w, h)
      g.fillStyle = 'rgba(0,0,0,0.12)'
      g.fillRect(w / 2 - 3, 0, 6, h)
      g.strokeStyle = 'rgba(120,90,70,0.25)'
      g.lineWidth = 1
      for (let y = 46; y < h - 20; y += 26) {
        g.beginPath()
        g.moveTo(20, y)
        g.lineTo(w - 20, y)
        g.stroke()
      }
      g.fillStyle = 'rgba(34,30,48,0.78)'
      g.font = `italic 400 19px ${FONTE_SERIF}`
      const linhas = ['001 — Escada', '002 — Espelho', '003 — Relógio', '004 — Sala', '005 — Pintura', '006 — 008', '009 —', '010 —', '011 —', '012 —', '013 —', '014 —']
      linhas.forEach((l, i) => {
        const col = i < 6 ? 0 : 1
        const y = 40 + (i % 6) * 26 * 2
        g.fillText(l, 36 + col * (w / 2), y)
        if (col === 1 && i < 11) {
          g.strokeStyle = 'rgba(34,30,48,0.6)'
          g.beginPath()
          g.moveTo(36 + w / 2 + 50, y - 6)
          g.lineTo(w - 40, y - 7)
          g.stroke()
        }
      })
      g.fillStyle = '#b8432f'
      g.fillText('requer um visitante', w / 2 + 92, 40 + 5 * 52)
    },
    1,
  )
  const tombo = new THREE.Group()
  const capa = caixa(0.64, 0.014, 0.45, new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.7 }), 0, 0.007, 0)
  const pag = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.43), [m.linho, m.linho, new THREE.MeshStandardMaterial({ map: paginas, roughness: 0.85 }), m.linho, m.linho, m.linho])
  pag.position.y = 0.02
  pag.receiveShadow = true
  tombo.add(capa, pag)
  tombo.position.set(4, 0.765, -29.6)
  tombo.rotation.y = 0.06
  c.cena.add(tombo, sombraContato(2.6, 1.4, 0.45, 4, -29.6, 0.004))
  alvo(c, { objetos: [pag, capa], tipo: () => 'documento', rotulo: () => tr('ler'), distancia: 4.5, acao: () => c.abrirDocumento('livro-tombo') })
  // abajur de mesa
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 24), c.mats.latao)
  base.position.set(4.85, 0.775, -29.95)
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8), c.mats.latao)
  haste.position.set(4.85, 0.98, -29.95)
  const cup = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.12, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#2f4636', side: THREE.DoubleSide, roughness: 0.5, emissive: '#ffcf8a', emissiveIntensity: 0.15 }))
  cup.position.set(4.85, 1.18, -29.95)
  c.cena.add(base, haste, cup)

  return {
    atualizar(dt: number) {
      const alvoA = puxado ? 1 : 0
      if (anim !== alvoA) {
        anim = Math.min(1, anim + dt * 1.6)
        const e = 1 - Math.pow(1 - anim, 3)
        pivo.rotation.x = e * 0.38
        pivo.position.z = zf - 0.012 + e * 0.05
      } else if (puxado) pivo.rotation.x = 0.38
    },
  } satisfies Peca
}

/** onde ficava a obra 014: um retângulo mais claro na parede, dois ganchos, uma placa */
function removida(c: Contexto) {
  const tex = canvasTexto(
    260,
    340,
    (g, w, h) => {
      g.clearRect(0, 0, w, h)
      g.fillStyle = 'rgba(255,255,255,0.34)'
      g.fillRect(10, 10, w - 20, h - 20)
      g.strokeStyle = 'rgba(70,64,56,0.12)'
      g.lineWidth = 3
      g.strokeRect(10, 10, w - 20, h - 20)
    },
    1,
  )
  const fant = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.7), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9, depthWrite: false }))
  fant.position.set(7.99, 2.05, -19)
  fant.rotation.y = -Math.PI / 2
  c.cena.add(fant)
  for (const dz of [-0.4, 0.4]) {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 8), c.mats.latao)
    g.rotation.z = Math.PI / 2
    g.position.set(7.985, 2.98, -19 + dz)
    c.cena.add(g)
  }
  const l = letreiro(
    0.36,
    0.22,
    desenharPlaca(
      () => `${tr('obra')} 014`,
      () => lt(OBRA['014'].rotuloOculto!),
      () => [tr('removida')],
    ),
    { resolucao: 1300, transparente: false },
  )
  l.malha.position.set(7.985, 1.45, -17.95)
  l.malha.rotation.y = -Math.PI / 2
  c.cena.add(l.malha)
  c.letreiros.push(l)
}

/** a vitrine: objetos achados no prédio */
function vitrine(c: Contexto, m: MatsMoveis) {
  const g = new THREE.Group()
  g.position.set(3.5, 0.9, -16.2)
  const chave = new THREE.Group()
  const anel = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 8, 24), c.mats.latao)
  anel.rotation.x = Math.PI / 2
  const haste = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.006, 0.008), c.mats.latao)
  haste.position.x = 0.065
  const dente = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.02), c.mats.latao)
  dente.position.set(0.1, 0, 0.012)
  chave.add(anel, haste, dente)
  chave.position.set(-0.6, 0.006, 0.05)
  chave.rotation.y = 0.4
  const relogio = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 32), c.mats.latao)
  relogio.position.set(-0.1, 0.006, -0.1)
  const oculos = new THREE.Group()
  for (const dx of [-0.032, 0.032]) {
    const lente = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0025, 8, 24), m.ferro)
    lente.rotation.x = Math.PI / 2
    lente.position.x = dx
    oculos.add(lente)
  }
  oculos.position.set(0.35, 0.004, 0.1)
  oculos.rotation.y = -0.3
  const carta = folha(0.14, 0.1, { semente: 9 })
  carta.position.set(0.7, 0.003, -0.05)
  carta.rotation.y = 0.2
  g.add(chave, relogio, oculos, carta)
  g.traverse((o) => (o.castShadow = true))
  c.cena.add(g, sombraContato(2.6, 1.3, 0.45, 3.5, -16.2, 0.004))
}

export function criarG02(c: Contexto): Peca {
  const m = materiaisMoveis()
  const s = sala(c, m)
  const l = leitura(c, m)
  removida(c)
  vitrine(c, m)
  return {
    atualizar(dt, cx) {
      s.atualizar(dt, cx)
      l.atualizar(dt)
    },
  }
}
