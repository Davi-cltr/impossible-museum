// Galeria 05 — Não Classificado: objetos cobertos, o memorando sobre a 014, O Eco (008) e a
// porta de serviço que só aparece depois que as obras 001 a 005 foram observadas.
// Também o corredor de serviço, a porta 014 e o gravador da escada.
import * as THREE from 'three'
import { tr } from '../../content/textos'
import { memoria, sabe } from '../../core/estado'
import { som } from '../../core/som'
import { canvasTexto, FONTE_SANS, sorteio } from '../base'
import { desenharPlaca, letreiro } from '../mundo'
import { Porta } from '../portas'
import { alvo, caixa, folha, materiaisMoveis, sombraContato, type Contexto, type Peca } from './comum'

/** um volume coberto por um pano: quinas marcadas no alto, dobras verticais e a barra caída no chão */
function pano(w: number, h: number, d: number, semente: number, m: THREE.Material) {
  const geo = new THREE.SphereGeometry(1, 72, 48)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const r = sorteio(semente)
  const fases = [r() * 6, r() * 6, r() * 6, r() * 6]
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const e = 0.14
    let x = Math.sign(v.x) * Math.pow(Math.abs(v.x), e) * (w / 2)
    let y = Math.sign(v.y) * Math.pow(Math.abs(v.y), 0.22) * (h / 2)
    let z = Math.sign(v.z) * Math.pow(Math.abs(v.z), e) * (d / 2)
    // 0 no topo, 1 no chão
    const desce = Math.min(1, Math.max(0, (h / 2 - y) / h))
    const ang = Math.atan2(z / d, x / w)
    const dobra =
      Math.sin(ang * 7 + fases[0] + desce * 1.2) * 0.55 + Math.sin(ang * 13 + fases[1] - desce * 2) * 0.3 + Math.sin(ang * 23 + fases[2]) * 0.15 * desce
    // as dobras nascem nas quinas e crescem para baixo; a barra abre no chão
    const abre = 1 + Math.pow(desce, 2.2) * 0.1 + dobra * 0.045 * Math.pow(desce, 1.3) + Math.pow(Math.max(0, desce - 0.88) / 0.12, 2) * 0.09
    x *= abre
    z *= abre
    // o topo cede entre as quinas
    if (desce < 0.12) {
      const meio = 1 - Math.max(Math.abs(x) / (w / 2), Math.abs(z) / (d / 2))
      y -= Math.max(0, meio) * 0.03 + Math.sin(x * 9 + fases[3]) * 0.004
    }
    y = Math.max(y, -h / 2) + h / 2
    pos.setXYZ(i, x, y, z)
  }
  geo.computeVertexNormals()
  const malha = new THREE.Mesh(geo, m)
  malha.castShadow = malha.receiveShadow = true
  return malha
}

export function criarG05(c: Contexto): Peca {
  const mm = materiaisMoveis()
  const tecido = new THREE.MeshStandardMaterial({ color: '#d6d1c6', roughness: 0.97 })
  const cobertos: [number, number, number, number, number, number][] = [
    [-28.2, -14.6, 1.6, 1.15, 1.0, 1],
    [-17.6, -27.4, 0.85, 1.95, 0.7, 2],
    [-28.4, -28.2, 2.2, 0.8, 1.4, 3],
    [-16.2, -15.8, 0.7, 1.05, 0.7, 4],
    [-26.6, -21.5, 1.0, 1.5, 0.9, 5],
  ]
  for (const [x, z, w, h, d, s] of cobertos) {
    const p = pano(w, h, d, s, tecido)
    p.position.set(x, 0, z)
    p.rotation.y = (s * 0.7) % 1
    c.cena.add(p, sombraContato(w * 1.6, d * 1.6, 0.55, x, z, 0.004))
    const m = Math.max(w, d) * 0.58
    c.mundo.blocos.push({ x0: x - m, x1: x + m, z0: z - m, z1: z + m, baixo: h < 1.4 })
  }
  // o memorando, sobre o pedestal
  const memo = folha(0.21, 0.297, { semente: 14 })
  memo.position.set(-15, 1.102, -29.8)
  memo.rotation.y = -0.12
  c.cena.add(memo, sombraContato(0.9, 0.9, 0.45, -15, -29.8, 0.004))
  alvo(c, { objetos: [memo], tipo: () => 'documento', rotulo: () => tr('ler'), distancia: 4, acao: () => c.abrirDocumento('memorando-014') })
  // a placa do acesso restrito, ao lado de onde a porta vai aparecer
  const placa = letreiro(
    0.42,
    0.26,
    desenharPlaca(
      () => `${tr('obra')} 014`,
      () => tr('acessoRestrito'),
      () => [tr('somenteFuncionarios')],
      { escura: true },
    ),
    { resolucao: 1300, transparente: false },
  )
  placa.malha.position.set(-19.3, 1.5, -32.985)
  c.cena.add(placa.malha)
  c.letreiros.push(placa)

  // a porta de serviço: um painel rente à parede, que só existe depois
  const servico = new Porta({
    id: 'servico',
    tipo: 'giro',
    eixo: 'x',
    centro: [-22, -33.2],
    largura: 2,
    altura: 2.6,
    espessura: 0.05,
    folha: mm.painel,
    quadro: c.mats.latao,
    som: 'painel',
    dobradica: -1,
    abrePara: -1,
  })
  servico.aoMover = (abrindo) => som.porta('painel', abrindo)
  servico.grupo.visible = false
  c.portas.servico = servico
  c.cena.add(servico.grupo)
  c.mundo.blocos.push(servico.bloco)
  alvo(c, {
    objetos: servico.alvos,
    tipo: () => 'porta',
    rotulo: () => (servico.alvo > 0.5 ? tr('fecharPorta') : tr('abrir')),
    distancia: 4,
    ativo: () => servico.grupo.visible,
    acao: () => servico.alternar(),
  })

  // corredor: aviso de "somente funcionários", luminárias, a porta 014
  const aviso = letreiro(
    0.5,
    0.16,
    (g, w, h) => {
      g.fillStyle = '#eceae4'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#1a1a1a'
      g.font = `600 ${h * 0.36}px ${FONTE_SANS}`
      g.textBaseline = 'middle'
      if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${h * 0.06}px`
      g.fillText(tr('somenteFuncionarios').toUpperCase(), w * 0.08, h / 2)
    },
    { resolucao: 1300, transparente: false },
  )
  aviso.malha.position.set(-20.4, 2.0, -33.79)
  aviso.malha.rotation.y = Math.PI
  c.cena.add(aviso.malha)
  c.letreiros.push(aviso)
  const lumin = new THREE.MeshBasicMaterial({ color: new THREE.Color('#eef4ff').multiplyScalar(1.8) })
  for (const x of [-20, -12]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.12), lumin)
    l.position.set(x, 3.38, -36.3)
    c.mundo.servico.espacos.add(l)
  }
  // caixas e um carrinho no corredor
  for (const [x, z, s] of [
    [-24, -37.6, 0.6],
    [-23.3, -37.7, 0.45],
    [-14, -34.6, 0.5],
  ] as const) {
    const b = caixa(s, s * 0.8, s, mm.linho, x, (s * 0.8) / 2, z)
    c.mundo.servico.espacos.add(b)
    c.mundo.blocos.push({ x0: x - s / 2, x1: x + s / 2, z0: z - s / 2, z1: z + s / 2, ativo: () => c.mundo.servico.espacos.visible, baixo: true })
  }

  const porta014 = new Porta({
    id: '014',
    tipo: 'giro',
    eixo: 'z',
    centro: [-4.8, -36.4],
    largura: 1.8,
    altura: 2.4,
    espessura: 0.06,
    folha: mm.acoPorta,
    quadro: c.mats.acoClaro,
    som: 'aco',
    dobradica: -1,
    abrePara: -1,
  })
  porta014.trancada = !sabe('segredos', 'livro')
  porta014.aoMover = (abrindo) => som.porta('aco', abrindo)
  // a plaquinha "014", do lado do corredor (gira com a folha)
  const num = canvasTexto(
    240,
    120,
    (g, w, h) => {
      g.fillStyle = '#d9d6cf'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#151515'
      g.font = `500 ${h * 0.62}px ${FONTE_SANS}`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('014', w / 2, h / 2 + 4)
    },
    1,
  )
  const plaq = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshStandardMaterial({ map: num, roughness: 0.5, metalness: 0.2 }))
  plaq.position.set(0, 1.6 - 1.195, -0.032)
  plaq.rotation.y = Math.PI
  porta014.painel?.add(plaq)
  c.portas['014'] = porta014
  c.cena.add(porta014.grupo)
  c.mundo.blocos.push(porta014.bloco)
  alvo(c, {
    objetos: porta014.alvos,
    tipo: () => (porta014.trancada ? 'trancada' : 'porta'),
    rotulo: () => (porta014.trancada ? tr('trancada') : porta014.alvo > 0.5 ? tr('fecharPorta') : tr('abrir')),
    distancia: 4,
    ativo: () => c.mundo.servico.espacos.visible,
    acao: () => {
      if (porta014.trancada) som.trancada()
      else porta014.alternar()
    },
  })

  // o gravador da escada
  alvo(c, {
    objetos: [c.mundo.escada.gravador],
    tipo: () => 'documento',
    rotulo: () => tr('ouvir'),
    distancia: 4,
    ativo: () => c.mundo.escada.gravador.visible,
    acao: () => c.abrirDocumento('gravacao-escada'),
  })

  const revelar = (avisar: boolean) => {
    c.mundo.servico.revelado = true
    c.mundo.servico.tampa.visible = false
    c.mundo.servico.espacos.visible = true
    servico.grupo.visible = true
    if (avisar) {
      som.trinco()
      c.descobrir('segredo', 'servico', tr('portaApareceu'))
    }
  }
  const condicao = () => ['001', '002', '003', '004', '005'].every((id) => memoria.obras.includes(id))
  if (sabe('segredos', 'servico') || condicao()) revelar(false)

  // O Eco: depois de alguns passos na galeria, quando você para, os passos continuam
  let passos = 0
  let ecos = 0
  const r = sorteio(8)
  return {
    atualizar(_dt, cx) {
      if (!cx.mundo.servico.revelado && condicao() && cx.sala() !== 'g05') revelar(true)
    },
    aoPasso(cx) {
      passos = cx.sala() === 'g05' ? passos + 1 : 0
    },
    aoParar(cx) {
      if (cx.sala() !== 'g05' || passos < 5 || !som.ligado) {
        passos = 0
        return
      }
      passos = 0
      if (ecos > 0 && r() > 0.55) return
      ecos++
      const piso = 'piso'
      // dois passos a mais, atrás e um pouco ao lado
      som.passo(piso, 0.8, -0.35, 0.6, 0.48)
      som.passo(piso, 0.7, -0.4, 0.45, 0.98)
      setTimeout(() => {
        cx.descobrir('achada', '008')
        cx.descobrir('anomalia', '008')
        cx.descobrir('obra', '008')
      }, 1600)
    },
  }
}
