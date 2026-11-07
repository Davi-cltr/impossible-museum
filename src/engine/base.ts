// Materiais do museu: texturas geradas em canvas (gesso, concreto polido, concreto de fôrma, carvalho,
// travertino, granilite) aplicadas em projeção triplanar, sem depender de UVs.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export function sorteio(semente = 1) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** ruído de valor suave e periódico, em grade de n células */
function ruido(tam: number, n: number, semente: number) {
  const r = sorteio(semente)
  const g = new Float32Array(n * n).map(() => r())
  const out = new Float32Array(tam * tam)
  for (let y = 0; y < tam; y++)
    for (let x = 0; x < tam; x++) {
      const fx = (x / tam) * n
      const fy = (y / tam) * n
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const tx = fx - x0
      const ty = fy - y0
      const sx = tx * tx * (3 - 2 * tx)
      const sy = ty * ty * (3 - 2 * ty)
      const a = g[(y0 % n) * n + (x0 % n)]
      const b = g[(y0 % n) * n + ((x0 + 1) % n)]
      const c = g[((y0 + 1) % n) * n + (x0 % n)]
      const d = g[((y0 + 1) % n) * n + ((x0 + 1) % n)]
      out[y * tam + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
    }
  return out
}

function fbm(tam: number, oitavas: [number, number][], semente: number) {
  const out = new Float32Array(tam * tam)
  let soma = 0
  oitavas.forEach(([n, peso], i) => {
    const r = ruido(tam, n, semente + i * 101)
    for (let k = 0; k < out.length; k++) out[k] += r[k] * peso
    soma += peso
  })
  for (let k = 0; k < out.length; k++) out[k] /= soma
  return out
}

/** textura RGBA: cor no RGB, rugosidade relativa no A */
function textura(tam: number, pintar: (x: number, y: number, i: number) => [number, number, number, number]) {
  const d = new Uint8Array(tam * tam * 4)
  for (let y = 0; y < tam; y++)
    for (let x = 0; x < tam; x++) {
      const i = y * tam + x
      const [r, g, b, a] = pintar(x, y, i)
      d[i * 4] = Math.max(0, Math.min(255, r * 255))
      d[i * 4 + 1] = Math.max(0, Math.min(255, g * 255))
      d[i * 4 + 2] = Math.max(0, Math.min(255, b * 255))
      d[i * 4 + 3] = Math.max(0, Math.min(255, a * 255))
    }
  const t = new THREE.DataTexture(d, tam, tam, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.anisotropy = 8
  t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

export function gerarTexturas(tam: number) {
  // gesso branco: manchas quase invisíveis
  const g1 = fbm(tam, [[6, 0.5], [24, 0.3], [90, 0.2]], 3)
  const gesso = textura(tam, (_x, _y, i) => {
    const v = 0.88 + (g1[i] - 0.5) * 0.04
    return [v, v * 0.99, v * 0.97, 0.55 + g1[i] * 0.3]
  })
  // concreto polido: agregado miúdo, nuvens, juntas serradas a cada 4 m (a textura cobre 4 m)
  const c1 = fbm(tam, [[4, 0.45], [16, 0.3], [64, 0.25]], 11)
  const c2 = ruido(tam, 220, 12)
  const piso = textura(tam, (x, y, i) => {
    let v = 0.62 + (c1[i] - 0.5) * 0.16
    if (c2[i] > 0.84) v += (c2[i] - 0.84) * 1.2
    if (c2[i] < 0.12) v -= (0.12 - c2[i]) * 0.9
    const jx = Math.min(x % tam, tam - (x % tam))
    const jy = Math.min(y % tam, tam - (y % tam))
    const junta = Math.min(jx, jy) < tam * 0.0018 ? 0.75 : 1
    v *= junta
    return [v, v * 0.985, v * 0.96, 0.35 + c1[i] * 0.4]
  })
  // concreto de fôrma: tábuas verticais de 15 cm, com veios e emendas
  const f1 = fbm(tam, [[3, 0.4], [12, 0.35], [48, 0.25]], 21)
  const f2 = fbm(tam, [[64, 1]], 22)
  const forma = textura(tam, (x, _y, i) => {
    const tabuas = 16
    const tx = (x / tam) * tabuas
    const tabua = Math.floor(tx)
    const emenda = Math.abs(tx - Math.round(tx)) < 0.025 ? 0.84 : 1
    const veio = (Math.sin((x / tam) * 900 + f2[i] * 12 + tabua * 7) * 0.5 + 0.5) * 0.04
    const v = (0.66 + (f1[i] - 0.5) * 0.16 + (sorteio(tabua + 5)() - 0.5) * 0.06 + veio) * emenda
    return [v, v * 0.99, v * 0.965, 0.7 + f1[i] * 0.3]
  })
  // carvalho: tábuas corridas de 20 cm, veio longo
  const m1 = fbm(tam, [[8, 1]], 31)
  const madeira = textura(tam, (x, y, i) => {
    const tabuas = 10
    const ty = (y / tam) * tabuas
    const tabua = Math.floor(ty)
    const rnd = sorteio(tabua * 13 + 1)
    const desl = rnd()
    const fim = ((x / tam + desl) % 1) < 0.004 ? 0.7 : 1
    const emenda = Math.abs(ty - Math.round(ty)) < 0.02 ? 0.72 : 1
    const veio = Math.sin((y / tam) * tabuas * 40 + m1[i] * 18 + Math.sin(x * 0.02 + desl * 9) * 1.4) * 0.5 + 0.5
    const tom = 0.9 + (rnd() - 0.5) * 0.14
    const r = (0.62 + veio * 0.1) * tom * emenda * fim
    return [r, r * 0.74, r * 0.5, 0.45 + veio * 0.25]
  })
  // travertino: bege, veios horizontais, poros
  const t1 = fbm(tam, [[2, 0.3], [6, 0.4], [30, 0.3]], 41)
  const t2 = ruido(tam, 160, 42)
  const travertino = textura(tam, (_x, y, i) => {
    const veio = Math.sin((y / tam) * 60 + t1[i] * 14) * 0.5 + 0.5
    let v = 0.8 + veio * 0.06 + (t1[i] - 0.5) * 0.08
    if (t2[i] > 0.86) v -= 0.12
    return [v, v * 0.93, v * 0.8, 0.5 + veio * 0.2]
  })
  // granilite: base cinza clara com lascas
  const r1 = ruido(tam, 300, 51)
  const r2 = ruido(tam, 300, 52)
  const granilite = textura(tam, (_x, _y, i) => {
    let v = 0.74
    let cor: [number, number, number] = [1, 0.99, 0.97]
    if (r1[i] > 0.8) {
      v = 0.35
      cor = [1, 1, 1]
    } else if (r2[i] > 0.82) {
      v = 0.9
      cor = [1, 0.92, 0.85]
    }
    return [v * cor[0], v * cor[1], v * cor[2], 0.4]
  })
  return { gesso, piso, forma, madeira, travertino, granilite }
}

export type Texturas = ReturnType<typeof gerarTexturas>

/** material com projeção triplanar em espaço de mundo (escala = metros por repetição) */
export function triplanar(
  params: THREE.MeshStandardMaterialParameters & { textura: THREE.Texture; escala: number; rugosidadeVar?: number; tom?: THREE.ColorRepresentation },
) {
  const { textura, escala, rugosidadeVar = 0.5, tom, ...resto } = params
  const m = new THREE.MeshStandardMaterial(resto)
  if (tom) m.color.set(tom)
  m.onBeforeCompile = (s) => {
    s.uniforms.tTri = { value: textura }
    s.uniforms.uTriEscala = { value: 1 / escala }
    s.uniforms.uRugVar = { value: rugosidadeVar }
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNormal;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvTriPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvTriNormal = normalize(mat3(modelMatrix) * objectNormal);',
      )
    s.fragmentShader = s.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D tTri; uniform float uTriEscala; uniform float uRugVar;
        varying vec3 vTriPos; varying vec3 vTriNormal;
        vec4 amostraTri() {
          vec3 n = abs(normalize(vTriNormal));
          n = pow(n, vec3(6.0)); n /= (n.x + n.y + n.z);
          vec3 p = vTriPos * uTriEscala;
          vec4 a = texture2D(tTri, p.zy) * n.x + texture2D(tTri, p.xz) * n.y + texture2D(tTri, p.xy) * n.z;
          return a;
        }`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec4 triAmostra = amostraTri();
        diffuseColor.rgb *= triAmostra.rgb;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor *= mix(1.0, 0.4 + triAmostra.a * 1.2, uRugVar);`,
      )
  }
  m.customProgramCacheKey = () => `tri-${escala}-${rugosidadeVar}`
  return m
}

export function criarMateriais(tx: Texturas) {
  return {
    gesso: triplanar({ textura: tx.gesso, escala: 3, roughness: 0.92, rugosidadeVar: 0.2 }),
    grafite: triplanar({ textura: tx.gesso, escala: 3, roughness: 0.9, rugosidadeVar: 0.2, tom: '#55534f' }),
    teto: triplanar({ textura: tx.gesso, escala: 3, roughness: 0.95, rugosidadeVar: 0.1, tom: '#f2f1ee' }),
    piso: triplanar({ textura: tx.piso, escala: 4, roughness: 0.32, rugosidadeVar: 0.7, envMapIntensity: 1.1 }),
    forma: triplanar({ textura: tx.forma, escala: 2.4, roughness: 0.88, rugosidadeVar: 0.3 }),
    madeira: triplanar({ textura: tx.madeira, escala: 2, roughness: 0.55, rugosidadeVar: 0.6 }),
    nogueira: triplanar({ textura: tx.madeira, escala: 2, roughness: 0.5, rugosidadeVar: 0.6, tom: '#7a5a46' }),
    travertino: triplanar({ textura: tx.travertino, escala: 1.6, roughness: 0.6, rugosidadeVar: 0.4 }),
    granilite: triplanar({ textura: tx.granilite, escala: 0.8, roughness: 0.35, rugosidadeVar: 0.3 }),
    servico: triplanar({ textura: tx.piso, escala: 4, roughness: 0.7, rugosidadeVar: 0.4, tom: '#9a9c9e' }),
    cascalho: triplanar({ textura: tx.granilite, escala: 1.4, roughness: 0.96, rugosidadeVar: 0.2, tom: '#8d877c' }),
    sebe: triplanar({ textura: tx.granilite, escala: 0.5, roughness: 0.95, rugosidadeVar: 0.3, tom: '#2f3a2c' }),
    escuro: triplanar({ textura: tx.forma, escala: 2.4, roughness: 0.9, rugosidadeVar: 0.3, tom: '#3b3a37' }),
    papelao: new THREE.MeshStandardMaterial({ color: '#b39a76', roughness: 0.92 }),
    aco: new THREE.MeshStandardMaterial({ color: '#2a2b2d', metalness: 0.85, roughness: 0.38 }),
    acoClaro: new THREE.MeshStandardMaterial({ color: '#b8b9bb', metalness: 0.9, roughness: 0.28 }),
    latao: new THREE.MeshStandardMaterial({ color: '#a8865a', metalness: 1, roughness: 0.32 }),
    preto: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.7 }),
    pedestal: new THREE.MeshStandardMaterial({ color: '#efeeea', roughness: 0.85 }),
    tecido: new THREE.MeshStandardMaterial({ color: '#e7e4dd', roughness: 0.95, side: THREE.DoubleSide }),
    vidro: new THREE.MeshPhysicalMaterial({
      color: '#dfe7e8',
      metalness: 0,
      roughness: 0.04,
      transmission: 0,
      transparent: true,
      opacity: 0.16,
      envMapIntensity: 1.6,
      depthWrite: false,
    }),
    luz: new THREE.MeshBasicMaterial({ color: new THREE.Color('#fffaf0').multiplyScalar(2.2), toneMapped: true }),
    invisivel: new THREE.MeshBasicMaterial({ visible: false }),
  }
}

export type Materiais = ReturnType<typeof criarMateriais>
export type ChaveMat = keyof Materiais

/** uma caixa para construir: centro, tamanho, material e se colide */
export interface Caixa {
  p: [number, number, number]
  s: [number, number, number]
  m: ChaveMat | null
  ry?: number
  rx?: number
  colide?: boolean
  sombra?: boolean
}

/** junta as caixas por material numa malha só (poucas chamadas de desenho) */
export function montar(caixas: Caixa[], mats: Materiais, { sombra = true } = {}) {
  const porMat = new Map<ChaveMat, THREE.BufferGeometry[]>()
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  for (const c of caixas) {
    if (!c.m) continue
    const g = new THREE.BoxGeometry(c.s[0], c.s[1], c.s[2])
    q.setFromEuler(new THREE.Euler(c.rx ?? 0, c.ry ?? 0, 0, 'YXZ'))
    m4.compose(new THREE.Vector3(...c.p), q, new THREE.Vector3(1, 1, 1))
    g.applyMatrix4(m4)
    g.deleteAttribute('uv')
    const l = porMat.get(c.m) ?? []
    l.push(g)
    porMat.set(c.m, l)
  }
  const grupo = new THREE.Group()
  for (const [k, gs] of porMat) {
    const geo = mergeGeometries(gs, false)
    gs.forEach((g) => g.dispose())
    if (!geo) continue
    const malha = new THREE.Mesh(geo, mats[k])
    const transparente = k === 'vidro' || k === 'luz'
    malha.castShadow = sombra && !transparente
    malha.receiveShadow = !transparente
    malha.name = k
    grupo.add(malha)
  }
  return grupo
}

/** texto em canvas para placas, letreiros e números pintados */
export function canvasTexto(
  largura: number,
  altura: number,
  desenhar: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  escala = 2,
) {
  const c = document.createElement('canvas')
  c.width = Math.round(largura * escala)
  c.height = Math.round(altura * escala)
  const g = c.getContext('2d')!
  g.scale(escala, escala)
  desenhar(g, largura, altura)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export const FONTE_SERIF = '"Instrument Serif", "Times New Roman", serif'
export const FONTE_SANS = '"Geist Variable", "Helvetica Neue", Arial, sans-serif'
export const FONTE_MONO = '"Geist Mono Variable", ui-monospace, monospace'
export const ACENTO = '#b8432f'
