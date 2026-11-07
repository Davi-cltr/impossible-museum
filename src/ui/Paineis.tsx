// Os painéis (carregados só quando abertos): o Arquivo, a Planta, os documentos e os ajustes.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import { DOC, DOCUMENTOS, GALERIAS, OBRA, OBRAS, type GaleriaId, type Obra } from '../content/acervo'
import { useLang } from '../content/textos'
import { esquecerTudo, memoria, mudarMemoria, mudarSessao, sessao, useMuseu, type Qualidade } from '../core/estado'
import { som } from '../core/som'
import { museu } from '../engine/api'
import { ESCADA, ESPACOS, PONTOS, SALA004 } from '../engine/planta'

const fechar = () => mudarSessao({ painel: 'nenhum', documento: null })

function BotaoFechar({ escuro = false }: { escuro?: boolean }) {
  const { t } = useLang()
  return (
    <button className={`fechar ${escuro ? 'escuro' : ''}`} onClick={fechar} aria-label={t('fechar')}>
      <span>{t('fechar')}</span>
      <i aria-hidden="true" />
    </button>
  )
}

/** abre com uma cortina e anima as linhas marcadas com .anima */
function useAbertura(ref: RefObject<HTMLElement | null>, chave: unknown = 0) {
  useLayoutEffect(() => {
    if (!ref.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.anima', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.035, delay: 0.15 })
      gsap.fromTo('.regua', { scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: 'expo.inOut', transformOrigin: 'left center', stagger: 0.05, delay: 0.1 })
    }, ref)
    return () => ctx.revert()
  }, [ref, chave])
}

// ——— o Arquivo

function estadoObra(o: Obra, m: typeof memoria) {
  const achada = !o.oculta || m.achadas.includes(o.id)
  return { achada, observada: m.obras.includes(o.id), anomalia: m.anomalias.includes(o.id) }
}

function Ficha({ o }: { o: Obra }) {
  const { t, l } = useLang()
  const m = useMuseu((_, mm) => mm)
  const e = estadoObra(o, m)
  const ref = useRef<HTMLDivElement>(null)
  useAbertura(ref, o.id)
  if (!e.achada)
    return (
      <div className="ficha bloqueada" ref={ref}>
        <span className="ficha-num anima">Nº {o.id}</span>
        <h2 className="ficha-titulo anima">{l(o.rotuloOculto ?? { en: 'Unknown', pt: 'Desconhecida' })}</h2>
        <div className="regua" />
        <p className="ficha-bloqueio anima">{t('bloqueada')}</p>
        <div className="tarjas anima" aria-hidden="true">
          {[78, 92, 64, 85, 40].map((w, i) => (
            <span key={i} style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    )
  const nota = o.curador && (o.id === '005' ? m.segredos.includes('pintura') : o.id === '002' ? m.segredos.includes('espelho') : e.anomalia)
  const ponto = PONTOS.find((p) => p.obra === o.id)
  return (
    <article className="ficha" ref={ref}>
      <span className="ficha-num anima">
        Nº {o.id} <em>{l(GALERIAS[o.galeria].nome)}</em>
      </span>
      <h2 className="ficha-titulo anima">{l(o.titulo)}</h2>
      <p className="ficha-meta anima">
        <span>{l(o.classificacao)}</span>
        <span>{l(o.status)}</span>
        <span>{e.observada ? t('observado') : t('naoObservado')}</span>
      </p>
      <div className="regua" />
      <p className="ficha-desc anima">{l(o.descricao)}</p>
      <dl className="ficha-dados anima">
        <div>
          <dt>{t('descoberta')}</dt>
          <dd>{l(o.descoberta)}</dd>
        </div>
        {o.ficha.map((f) => (
          <div key={f.k.en}>
            <dt>{l(f.k)}</dt>
            <dd>{l(f.v)}</dd>
          </div>
        ))}
      </dl>
      {e.anomalia && (
        <section className="ficha-anomalia anima">
          <h3>{t('observado')}</h3>
          <p>{l(o.anomalia)}</p>
        </section>
      )}
      {o.id === '002' && m.segredos.includes('espelho') && (
        <section className="ficha-espelho anima">
          <h3>{t('rotuloEspelho')}</h3>
          <p className="espelhado-texto">
            <strong>
              {t('obra')} 014 — {t('espelhoTitulo')}
            </strong>
            <br />
            {t('espelhoL1')} {t('espelhoL2')}
          </p>
        </section>
      )}
      {nota && o.curador && (
        <blockquote className="ficha-nota anima">
          <span>{t('notaCurador')}</span>“{l(o.curador)}”
        </blockquote>
      )}
      {ponto && (
        <button
          className="ficha-ir anima"
          onClick={() => {
            fechar()
            museu()?.irParaPonto(ponto.id)
          }}
        >
          {t('irPara')} <span aria-hidden="true">→</span>
        </button>
      )}
    </article>
  )
}

function Arquivo() {
  const { t, l } = useLang()
  const m = useMuseu((_, mm) => mm)
  const inicial = useMuseu((s) => s.obraArquivo)
  const [sel, setSel] = useState<string>(inicial ?? OBRAS.find((o) => estadoObra(o, m).achada)?.id ?? '001')
  const ref = useRef<HTMLDivElement>(null)
  useAbertura(ref)
  const conhecidas = OBRAS.filter((o) => estadoObra(o, m).achada).length
  const docs = DOCUMENTOS.filter((d) => m.documentos.includes(d.id))
  const ordem = useMemo(() => [...OBRAS].sort((a, b) => a.id.localeCompare(b.id)), [])
  return (
    <div className="arquivo folha-papel" ref={ref} role="dialog" aria-modal="true" aria-label={t('arquivo')}>
      <BotaoFechar escuro />
      <div className="arquivo-indice">
        <h1 className="arquivo-titulo anima">{t('arquivo')}</h1>
        <p className="arquivo-conta anima">
          {conhecidas} / {OBRAS.length} {t('catalogadas')} · {m.obras.length} {t('observadas')}
        </p>
        <div className="regua" />
        <h3 className="arquivo-secao anima">{t('obras')}</h3>
        <ol className="arquivo-lista">
          {ordem.map((o) => {
            const e = estadoObra(o, m)
            return (
              <li key={o.id} className="anima">
                <button className={`${sel === o.id ? 'sel' : ''} ${e.achada ? '' : 'fechada'}`} onClick={() => setSel(o.id)} aria-current={sel === o.id}>
                  <span className="al-num">{o.id}</span>
                  <span className="al-titulo">{e.achada ? l(o.titulo) : l(o.rotuloOculto ?? { en: 'Unknown', pt: 'Desconhecida' })}</span>
                  <span className={`al-marca ${e.observada ? 'vista' : ''} ${e.anomalia ? 'anomalia' : ''}`} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ol>
        <h3 className="arquivo-secao anima">{t('documentos')}</h3>
        {docs.length === 0 ? (
          <p className="arquivo-vazio anima">{t('nenhumDoc')}</p>
        ) : (
          <ul className="arquivo-docs">
            {docs.map((d) => (
              <li key={d.id} className="anima">
                <button onClick={() => museu()?.abrirDocumento(d.id)}>
                  <span className="ad-titulo">{l(d.titulo)}</span>
                  <span className="ad-local">{l(d.local)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="arquivo-pe anima">
          {t('nome')} — {m.visitas} {m.visitas === 1 ? (memoria.lang === 'pt' ? 'visita' : 'visit') : memoria.lang === 'pt' ? 'visitas' : 'visits'}
        </p>
      </div>
      <div className="arquivo-ficha">
        <Ficha o={OBRA[sel]} />
      </div>
    </div>
  )
}

// ——— a Planta

const quebra = (texto: string, largura: number) => texto.length * 1.05 >= largura && texto.includes(' ')

/** nome da sala em uma ou duas linhas, conforme a largura */
function Quebra({ texto, largura, x }: { texto: string; largura: number; x: number }) {
  if (!quebra(texto, largura)) return <>{texto}</>
  const palavras = texto.split(' ')
  let melhor = 1
  let dif = Infinity
  for (let i = 1; i < palavras.length; i++) {
    const a = palavras.slice(0, i).join(' ').length
    const b = palavras.slice(i).join(' ').length
    if (Math.abs(a - b) < dif) {
      dif = Math.abs(a - b)
      melhor = i
    }
  }
  return (
    <>
      <tspan x={x} dy="-1.1">
        {palavras.slice(0, melhor).join(' ')}
      </tspan>
      <tspan x={x} dy="2.4">
        {palavras.slice(melhor).join(' ')}
      </tspan>
    </>
  )
}

const CAIXA = { x0: -47, z0: -46, x1: 37, z1: 36 }

/** onde cada obra está na planta (junto da parede, longe dos nomes das salas) */
const POS_OBRA: Record<string, [number, number]> = {
  '001': [-33.2, 0],
  '002': [32.3, -21],
  '003': [32.3, 0],
  '004': [-2.6, -28.8],
  '005': [24, -32.3],
  '006': [-27.2, -6.6],
  '007': [22, 7.3],
  '008': [-27, -30.5],
  '014': [9.5, -40],
}

function Planta() {
  const { t, l } = useLang()
  const m = useMuseu((_, mm) => mm)
  const ref = useRef<HTMLDivElement>(null)
  const voce = useRef<SVGGElement>(null)
  const [nivel, setNivel] = useState(1)
  const [sobre, setSobre] = useState<string | null>(null)
  useAbertura(ref)

  // as linhas se desenham
  useLayoutEffect(() => {
    if (!ref.current) return
    const ctx = gsap.context(() => {
      const linhas = gsap.utils.toArray<SVGGeometryElement>('.p-sala rect.p-contorno')
      linhas.forEach((el) => {
        const c = el.getTotalLength?.() ?? 100
        el.style.strokeDasharray = `${c}`
        el.style.strokeDashoffset = `${c}`
      })
      gsap.to(linhas, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: 0.05, delay: 0.1, onComplete: () => linhas.forEach((el) => (el.style.strokeDasharray = 'none')) })
      gsap.fromTo('.p-rotulo, .p-obra', { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.02, delay: 0.9 })
    }, ref)
    return () => ctx.revert()
  }, [])

  // "você está aqui" acompanha o visitante
  useEffect(() => {
    let raf = 0
    const laco = () => {
      raf = requestAnimationFrame(laco)
      const p = museu()?.posicaoMapa()
      if (!p || !voce.current) return
      voce.current.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.z.toFixed(2)}) rotate(${((-p.yaw * 180) / Math.PI).toFixed(1)})`)
      setNivel((n) => (n !== p.nivel ? p.nivel : n))
    }
    raf = requestAnimationFrame(laco)
    return () => cancelAnimationFrame(raf)
  }, [])

  const servico = m.segredos.includes('servico')
  const s014 = m.achadas.includes('014')
  const visitou = (s: GaleriaId) => m.salas.includes(s)
  const salas = ESPACOS.filter((e) => {
    if (e.longe) return e.id === 's014' && s014
    if (e.oculto) return servico
    return true
  })
  const nomeSala = (id: string, sala: GaleriaId) => {
    if (id === 'p24' || id === 'p25') return null
    if (id === 'vestibulo') return null
    return GALERIAS[sala]
  }

  return (
    <div className="planta folha-papel" ref={ref} role="dialog" aria-modal="true" aria-label={t('mapa')}>
      <BotaoFechar escuro />
      <header className="planta-cabeca">
        <h1 className="anima">{t('mapa')}</h1>
        <p className="anima">
          {nivel === 1 ? t('planta') : `${t('nivel')} ${nivel >= 1 ? nivel : `B${1 - nivel}`} — ${l(GALERIAS.escada.nome)}`}
        </p>
        <ul className="planta-legenda anima">
          <li>
            <i className="lg-voce" /> {t('vocêEstaAqui')}
          </li>
          <li>
            <i className="lg-nao" /> {t('naoVisitada')}
          </li>
          {s014 && (
            <li>
              <i className="lg-014" /> {l(GALERIAS.s014.nome)}
            </li>
          )}
        </ul>
      </header>
      <div className="planta-desenho">
        <svg viewBox={`${CAIXA.x0} ${CAIXA.z0} ${CAIXA.x1 - CAIXA.x0} ${CAIXA.z1 - CAIXA.z0}`} role="img" aria-label={t('mapa')}>
          <defs>
            <pattern id="hachura" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="1.4" stroke="rgba(30,28,26,0.22)" strokeWidth="0.18" />
            </pattern>
            <pattern id="hachura014" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <line x1="0" y1="0" x2="0" y2="1.2" stroke="rgba(184,67,47,0.45)" strokeWidth="0.2" />
            </pattern>
          </defs>
          {/* praça */}
          <rect x={-24} y={11.4} width={48} height={22.2} className="p-praca" />
          <text x={0} y={27} className="p-rotulo p-fora" textAnchor="middle">
            {memoria.lang === 'pt' ? 'Praça de entrada' : 'Entrance court'}
          </text>
          {salas.map((e) => {
            const r = e.mapa ?? e
            const g = nomeSala(e.id, e.sala)
            const vis = visitou(e.sala) || e.id.startsWith('p') || e.id === 'vestibulo'
            const eh014 = e.id === 's014'
            const clicavel = !!g && vis && !eh014 && e.id !== 'servico'
            return (
              <g
                key={e.id}
                className={`p-sala ${vis ? 'visitada' : 'nao'} ${eh014 ? 'impossivel' : ''} ${clicavel ? 'clicavel' : ''} ${sobre === e.id ? 'sobre' : ''}`}
                onPointerEnter={() => clicavel && setSobre(e.id)}
                onPointerLeave={() => setSobre(null)}
                onClick={() => {
                  if (!clicavel) return
                  som.toque()
                  fechar()
                  museu()?.irParaSala(e.sala)
                }}
              >
                <rect x={r.x0} y={r.z0} width={r.x1 - r.x0} height={r.z1 - r.z0} className="p-fundo" fill={eh014 ? 'url(#hachura014)' : vis ? undefined : 'url(#hachura)'} />
                <rect x={r.x0 - 0.2} y={r.z0 - 0.2} width={r.x1 - r.x0 + 0.4} height={r.z1 - r.z0 + 0.4} className="p-contorno" />
                {/* vãos */}
                {e.vaos.map((v, i) => {
                  const w = v.b - v.a
                  if (v.lado === 'n') return <rect key={i} x={v.a} y={r.z0 - 0.5} width={w} height={0.6} className="p-vao" />
                  if (v.lado === 's') return <rect key={i} x={v.a} y={r.z1 - 0.1} width={w} height={0.6} className="p-vao" />
                  if (v.lado === 'o') return <rect key={i} x={r.x0 - 0.5} y={v.a} width={0.6} height={w} className="p-vao" />
                  return <rect key={i} x={r.x1 - 0.1} y={v.a} width={0.6} height={w} className="p-vao" />
                })}
                {g && (
                  <g className="p-rotulo">
                    {g.numero && !eh014 && e.id !== 'escada' && (
                      <text x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2 - (vis && quebra(l(g.nome), r.x1 - r.x0) ? 3.0 : 1.6)} className="p-num" textAnchor="middle">
                        {g.numero}
                      </text>
                    )}
                    <text x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2 + (eh014 ? -3 : 0.9)} className={eh014 ? 'p-nome p-nome-014' : 'p-nome'} textAnchor="middle">
                      {eh014 ? '014' : vis ? <Quebra texto={l(g.nome)} largura={r.x1 - r.x0} x={(r.x0 + r.x1) / 2} /> : '—'}
                    </text>
                    {eh014 && (
                      <text x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2 - 0.6} className="p-sub p-sub-014" textAnchor="middle">
                        {l(GALERIAS.s014.sub)}
                      </text>
                    )}
                    {!vis && !eh014 && r.z1 - r.z0 > 8 && (
                      <text x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2 + 3.2} className="p-sub" textAnchor="middle">
                        {t('naoVisitada')}
                      </text>
                    )}
                    {clicavel && sobre === e.id && (
                      <text x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2 + 3.4} className="p-ir" textAnchor="middle">
                        {t('irPara')} →
                      </text>
                    )}
                  </g>
                )}
              </g>
            )
          })}
          {/* A Sala, dentro da Galeria 02 */}
          <g className={`p-sala ${visitou('sala004') ? 'visitada' : 'nao'}`}>
            <rect x={SALA004.x0} y={SALA004.z0} width={SALA004.x1 - SALA004.x0} height={SALA004.z1 - SALA004.z0} className="p-fundo p-interna" />
            <rect x={SALA004.x0} y={SALA004.z0} width={SALA004.x1 - SALA004.x0} height={SALA004.z1 - SALA004.z0} className="p-contorno p-fina" />
          </g>
          {/* degraus na torre da escada */}
          <g className="p-degraus">
            {Array.from({ length: 12 }, (_, i) => {
              const z = ESCADA.zBase - (i * (ESCADA.zBase - ESCADA.zTopo)) / 12
              return (
                <g key={i}>
                  <line x1={ESCADA.a.x0} x2={ESCADA.a.x1} y1={z} y2={z} />
                  <line x1={ESCADA.b.x0} x2={ESCADA.b.x1} y1={z} y2={z} />
                </g>
              )
            })}
            <text x={(ESCADA.x0 + ESCADA.x1) / 2} y={ESCADA.z0 - 1.2} textAnchor="middle" className="p-sub p-rotulo">
              ∞
            </text>
          </g>
          {/* obras observadas */}
          {Object.entries(POS_OBRA)
            .filter(([id]) => m.obras.includes(id) && (id !== '014' || s014))
            .map(([id, [x, z]]) => (
              <g key={id} className="p-obra" transform={`translate(${x} ${z})`}>
                <circle r={0.7} />
                <text y={-1.2} textAnchor="middle">
                  {id}
                </text>
              </g>
            ))}
          {/* norte e escala */}
          <g className="p-norte" transform={`translate(${CAIXA.x1 - 5} ${CAIXA.z0 + 6})`}>
            <path d="M0 -3 L1.4 2 L0 1 L-1.4 2 Z" />
            <text y={-4} textAnchor="middle">
              N
            </text>
          </g>
          <g className="p-escala" transform={`translate(${CAIXA.x0 + 3} ${CAIXA.z1 - 4})`}>
            <line x1={0} x2={10} y1={0} y2={0} />
            <line x1={0} x2={0} y1={-0.6} y2={0.6} />
            <line x1={10} x2={10} y1={-0.6} y2={0.6} />
            <text x={5} y={-1.2} textAnchor="middle">
              10 m
            </text>
          </g>
          <g ref={voce} className="p-voce">
            <path d="M0 0 L-2.6 -6.2 A6.8 6.8 0 0 1 2.6 -6.2 Z" className="p-cone" />
            <circle r={2.2} className="p-pulso" />
            <circle r={0.9} className="p-ponto" />
          </g>
        </svg>
      </div>
    </div>
  )
}

// ——— documentos

function Documento() {
  const { t, l, lang } = useLang()
  const id = useMuseu((s) => s.documento)
  const ref = useRef<HTMLDivElement>(null)
  const [linhas, setLinhas] = useState(0)
  const d = id ? DOC[id] : null
  useAbertura(ref, id)
  const texto = d ? l(d.corpo) : ''
  const partes = useMemo(() => texto.split('\n'), [texto])
  // a gravação aparece aos poucos, como uma transcrição feita na hora
  useEffect(() => {
    if (!d || d.tipo !== 'gravacao') return
    const palavras = texto.split(' ').length
    let n = 0
    const iv = window.setInterval(() => {
      n++
      setLinhas(n)
      if (n >= palavras) window.clearInterval(iv)
    }, sessao.reduzido ? 1 : 120)
    return () => window.clearInterval(iv)
  }, [d, texto])
  if (!d) return null
  const voltar = () => mudarSessao({ painel: 'arquivo', documento: null })
  return (
    <div className={`documento doc-${d.tipo}`} ref={ref} role="dialog" aria-modal="true" aria-label={l(d.titulo)} onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="doc-folha">
        <BotaoFechar escuro={d.tipo !== 'gravacao'} />
        <p className="doc-local anima">{l(d.local)}</p>
        <h1 className="doc-titulo anima">{l(d.titulo)}</h1>
        <div className="regua" />
        {d.tipo === 'gravacao' ? (
          <>
            <div className="fita anima" aria-hidden="true">
              <span className="fita-rolo" />
              <svg viewBox="0 0 200 30" preserveAspectRatio="none">
                <polyline className="fita-onda" points={Array.from({ length: 80 }, (_, i) => `${i * 2.53},${15 + Math.sin(i * 1.7) * (i % 7) * 1.4}`).join(' ')} />
              </svg>
              <span className="fita-rolo" />
            </div>
            <p className="doc-corpo doc-transcricao">
              {texto
                .split(' ')
                .slice(0, linhas)
                .map((p, i) => (
                  <span key={i} className={p.startsWith('[') || p.endsWith(']') ? 'doc-nota' : ''}>
                    {p}{' '}
                  </span>
                ))}
              <span className="doc-cursor" aria-hidden="true" />
            </p>
            <p className="visualmente-oculto">{texto}</p>
          </>
        ) : (
          <div className="doc-corpo">
            {partes.map((p, i) => (p.trim() === '' ? <br key={i} /> : <p key={i} className="anima">{p}</p>))}
          </div>
        )}
        <button className="doc-voltar anima" onClick={voltar}>
          ← {t('arquivo')}
        </button>
        <span className="doc-data" aria-hidden="true">
          {lang === 'pt' ? 'Documento' : 'Document'} {String(DOCUMENTOS.indexOf(d) + 1).padStart(2, '0')} / {String(DOCUMENTOS.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

// ——— ajustes

function Opcao<T extends string>({ valor, atual, rotulo, aoEscolher }: { valor: T; atual: T; rotulo: string; aoEscolher: (v: T) => void }) {
  return (
    <button className={`opcao ${valor === atual ? 'ativa' : ''}`} onClick={() => aoEscolher(valor)} aria-pressed={valor === atual}>
      {rotulo}
    </button>
  )
}

function Ajustes() {
  const { t } = useLang()
  const m = useMuseu((_, mm) => mm)
  const qualidade = useMuseu((s) => s.qualidade)
  const reduzido = useMuseu((s) => s.reduzido)
  const [confirma, setConfirma] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useAbertura(ref)
  const definirQ = (q: Qualidade | 'auto') => {
    mudarMemoria({ qualidade: q })
    const efetiva = q === 'auto' ? sessao.qualidade : q
    mudarSessao({ qualidade: efetiva })
    museu()?.definirQualidade(efetiva)
  }
  return (
    <div className="ajustes-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="ajustes" ref={ref} role="dialog" aria-modal="true" aria-label={t('ajustes')}>
        <BotaoFechar />
        <h1 className="anima">{t('ajustes')}</h1>
        <div className="regua" />
        <section className="anima">
          <h3>{t('som')}</h3>
          <div className="opcoes">
            <Opcao
              valor="sim"
              atual={m.som ? 'sim' : 'nao'}
              rotulo={t('ligado')}
              aoEscolher={() => {
                mudarMemoria({ som: true })
                som.iniciar(true)
              }}
            />
            <Opcao
              valor="nao"
              atual={m.som ? 'sim' : 'nao'}
              rotulo={t('desligado')}
              aoEscolher={() => {
                mudarMemoria({ som: false })
                som.definirLigado(false)
              }}
            />
          </div>
        </section>
        <section className="anima">
          <h3>{t('idioma')}</h3>
          <div className="opcoes">
            <Opcao valor="en" atual={m.lang} rotulo="English" aoEscolher={(v) => mudarMemoria({ lang: v })} />
            <Opcao valor="pt" atual={m.lang} rotulo="Português" aoEscolher={(v) => mudarMemoria({ lang: v })} />
          </div>
        </section>
        <section className="anima">
          <h3>{t('qualidade')}</h3>
          <div className="opcoes">
            <Opcao valor="auto" atual={m.qualidade === 'auto' ? 'auto' : qualidade} rotulo="Auto" aoEscolher={definirQ} />
            <Opcao valor="alta" atual={m.qualidade === 'auto' ? 'auto' : qualidade} rotulo={t('alta')} aoEscolher={definirQ} />
            <Opcao valor="media" atual={m.qualidade === 'auto' ? 'auto' : qualidade} rotulo={t('media')} aoEscolher={definirQ} />
            <Opcao valor="baixa" atual={m.qualidade === 'auto' ? 'auto' : qualidade} rotulo={t('baixa')} aoEscolher={definirQ} />
          </div>
        </section>
        <section className="anima">
          <h3>{t('movimento')}</h3>
          <div className="opcoes">
            <Opcao
              valor="sim"
              atual={reduzido ? 'sim' : 'nao'}
              rotulo={t('ligado')}
              aoEscolher={() => {
                mudarMemoria({ reduzido: true })
                mudarSessao({ reduzido: true })
              }}
            />
            <Opcao
              valor="nao"
              atual={reduzido ? 'sim' : 'nao'}
              rotulo={t('desligado')}
              aoEscolher={() => {
                mudarMemoria({ reduzido: false })
                mudarSessao({ reduzido: false })
              }}
            />
          </div>
        </section>
        <section className="anima ajustes-esquecer">
          {confirma ? (
            <>
              <p>{t('esquecerConfirma')}</p>
              <div className="opcoes">
                <button className="opcao perigo" onClick={esquecerTudo}>
                  {t('sim')}
                </button>
                <button className="opcao" onClick={() => setConfirma(false)}>
                  {t('nao')}
                </button>
              </div>
            </>
          ) : (
            <button className="ajustes-link" onClick={() => setConfirma(true)}>
              {t('esquecer')}
            </button>
          )}
        </section>
        <p className="ajustes-pe anima">
          {m.visitas} {m.lang === 'pt' ? (m.visitas === 1 ? 'visita' : 'visitas') : m.visitas === 1 ? 'visit' : 'visits'} · {m.lang === 'pt' ? 'desde' : 'since'}{' '}
          {new Date(m.primeiraVisita).toLocaleDateString(m.lang === 'pt' ? 'pt-BR' : 'en-GB', { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

export default function Paineis() {
  const painel = useMuseu((s) => s.painel)
  const documento = useMuseu((s) => s.documento)
  if (painel === 'arquivo') return <Arquivo />
  if (painel === 'mapa') return <Planta />
  if (painel === 'documento') return <Documento key={documento ?? ''} />
  if (painel === 'ajustes') return <Ajustes />
  return null
}
