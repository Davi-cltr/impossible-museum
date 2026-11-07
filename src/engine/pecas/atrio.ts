// Átrio e Galeria 01: a carta do Curador no balcão, os títulos nas paredes, A Sombra e a placa
// da escada.
import * as THREE from 'three'
import { GALERIAS } from '../../content/acervo'
import { lt, tr } from '../../content/textos'
import { canvasTexto, sorteio } from '../base'
import { PONTO } from '../planta'
import { alvo, caixa, folha, placaObra, sombraContato, textoParede, type Contexto, type Peca } from './comum'

function titulosGalerias(c: Contexto) {
  const titulo = (id: 'g01' | 'g02' | 'g03' | 'g04' | 'g05', pos: [number, number, number], ry: number, w = 5.2, alinh: CanvasTextAlign = 'left') =>
    textoParede(
      c,
      () => [
        { texto: `${tr('exposicao')} ${GALERIAS[id].numero}`.toUpperCase(), tamanho: 0.13, espaco: 0.16, cor: '#5a5650' },
        { texto: lt(GALERIAS[id].nome), tamanho: 0.34, serif: true },
        { texto: lt(GALERIAS[id].sub), tamanho: 0.12, cor: '#55524c' },
      ],
      w,
      1.25,
      pos,
      ry,
      alinh,
    )
  // sobre os vãos do átrio
  titulo('g01', [-10.985, 5.55, 0], Math.PI / 2, 5.2, 'center')
  titulo('g02', [0, 5.55, -10.985], 0, 5.2, 'center')
  titulo('g03', [10.985, 5.55, 0], -Math.PI / 2, 5.2, 'center')
  // dentro de cada galeria, perto da entrada
  titulo('g01', [-14.6, 2.6, -7.985], 0, 4)
  titulo('g02', [-7.985, 2.6, -14.8], Math.PI / 2, 4)
  titulo('g03', [14.8, 2.6, -7.985], 0, 4)
  titulo('g04', [11.815, 2.6, -12.4], Math.PI / 2, 4)
  titulo('g05', [-32.985, 2.6, -12.4], Math.PI / 2, 4)
}

function diretorio(c: Contexto) {
  textoParede(
    c,
    () => [
      { texto: tr('nome').toUpperCase(), tamanho: 0.07, espaco: 0.2, cor: '#4f4b45' },
      { texto: ' ', tamanho: 0.04 },
      ...(['g01', 'g02', 'g03', 'g04', 'g05'] as const).map((g) => ({ texto: `${GALERIAS[g].numero}   ${lt(GALERIAS[g].nome)}`, tamanho: 0.085, serif: true })),
      { texto: ' ', tamanho: 0.04 },
      { texto: tr('horario'), tamanho: 0.042, cor: '#5a5650' },
    ],
    3.2,
    2.6,
    [-10.985, 2.6, 7.4],
    Math.PI / 2,
  )
}

function inscricoes(c: Contexto) {
  // na parede norte do átrio, grande, em serifa
  textoParede(c, () => [{ texto: tr('nome'), tamanho: 0.62, serif: true, cor: '#2a2926' }], 15, 1.9, [0, 10.2, -10.985], 0, 'center')
  // na fachada, sobre a marquise, em versais espaçadas
  textoParede(c, () => [{ texto: tr('nome').toUpperCase(), tamanho: 0.5, espaco: 0.32, cor: '#33312d' }], 15, 1.1, [0, 7.7, 11.415], 0, 'center')
}

function cartaBalcao(c: Contexto) {
  const carta = folha(0.21, 0.297, { manuscrito: true, semente: 3 })
  carta.position.set(6.9, 1.062, 5.52)
  carta.rotation.y = 0.18
  c.cena.add(carta)
  // uma caneta e um carimbo de data
  const caneta = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8), c.mats.preto)
  caneta.rotation.z = Math.PI / 2
  caneta.rotation.y = 0.5
  caneta.position.set(7.18, 1.066, 5.42)
  c.cena.add(caneta)
  const sino = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.03, 20), c.mats.latao)
  sino.position.set(5.3, 1.075, 5.6)
  c.cena.add(sino)
  alvo(c, { objetos: [carta], tipo: () => 'documento', rotulo: () => tr('ler'), distancia: 4, acao: () => c.abrirDocumento('boas-vindas') })
  c.cena.add(sombraContato(4.8, 1.5, 0.5, 6.2, 5.6))
  for (const [x, z] of [
    [-5.6, -3.6],
    [5.6, -3.6],
    [-5.6, 3.2],
  ])
    c.cena.add(sombraContato(3.0, 1.0, 0.45, x, z, 0.004))
}

/** uma tela grande, cinzenta, na Galeria 01 (não é anômala: o museu também tem obras comuns) */
function telaCinza(c: Contexto) {
  const r = sorteio(77)
  const tex = canvasTexto(
    480,
    600,
    (g, w, h) => {
      g.fillStyle = '#8e8b85'
      g.fillRect(0, 0, w, h)
      for (let i = 0; i < 2600; i++) {
        const x = r() * w
        const y = r() * h
        const l = 0.48 + r() * 0.1
        g.strokeStyle = `rgba(${l * 255},${l * 252},${l * 246},${0.04 + r() * 0.05})`
        g.lineWidth = 2 + r() * 6
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 14)
        g.stroke()
      }
    },
    1,
  )
  const tela = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.0, 0.05), [
    c.mats.pedestal,
    c.mats.pedestal,
    c.mats.pedestal,
    c.mats.pedestal,
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }),
    c.mats.pedestal,
  ])
  tela.position.set(-22, 2.5, 7.97)
  tela.rotation.y = Math.PI
  tela.castShadow = tela.receiveShadow = true
  c.cena.add(tela)
}

/** 006 — A Sombra: o pedestal vazio; o vaso só existe para o refletor */
function sombra(c: Contexto) {
  const ped = caixa(0.5, 1.1, 0.5, c.mats.pedestal, -27.2, 0.55, -7.0)
  c.cena.add(ped)
  c.cena.add(sombraContato(0.9, 0.9, 0.45, -27.2, -7.0, 0.004))
  const perfil: THREE.Vector2[] = []
  const pts = [
    [0.0, 0],
    [0.075, 0],
    [0.085, 0.025],
    [0.13, 0.13],
    [0.158, 0.26],
    [0.148, 0.36],
    [0.1, 0.46],
    [0.06, 0.54],
    [0.054, 0.59],
    [0.078, 0.64],
    [0.08, 0.655],
  ]
  for (const [x, y] of pts) perfil.push(new THREE.Vector2(x, y))
  const vaso = new THREE.Mesh(new THREE.LatheGeometry(perfil, 40), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }))
  vaso.position.set(-27.2, 1.1, -7.0)
  vaso.castShadow = true
  vaso.layers.set(3)
  c.cena.add(vaso)
  placaObra(c, '006', [-25.2, 1.45, -7.985], 0)
  placaObra(c, '001', [-32.985, 1.45, 2.55], Math.PI / 2)
  // clicar no pedestal leva para diante dele
  alvo(c, { objetos: [ped], tipo: () => 'obra', rotulo: () => tr('observar'), distancia: 14, acao: () => c.irParaPonto('obra-006') })
}

export function criarAtrioEG01(c: Contexto): Peca {
  titulosGalerias(c)
  diretorio(c)
  inscricoes(c)
  cartaBalcao(c)
  telaCinza(c)
  sombra(c)
  void PONTO
  return {}
}
