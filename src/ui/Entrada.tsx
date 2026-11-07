// A entrada: o nome do museu, a frase, ENTRAR — e a transição para dentro.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { memoria, mudarMemoria, sessao, useMuseu } from '../core/estado'
import { useLang } from '../content/textos'
import { museu } from '../engine/api'
import { som } from '../core/som'

const LINHAS = ['The', 'Impossible', 'Museum']

function Letras({ texto }: { texto: string }) {
  return (
    <span className="entrada-linha" aria-hidden="true">
      {[...texto].map((c, i) => (
        <span key={i} className="entrada-letra">
          {c}
        </span>
      ))}
    </span>
  )
}

export function Entrada() {
  const { fase, pronto, carregado, somLigado } = useMuseu((s, m) => ({ fase: s.fase, pronto: s.pronto, carregado: s.carregado, somLigado: m.som }))
  const { t, lang } = useLang()
  const raiz = useRef<HTMLDivElement>(null)
  const [fora, setFora] = useState(false)
  const [visivel, setVisivel] = useState(true)
  const [agora, setAgora] = useState(() => new Date())

  useLayoutEffect(() => {
    if (!raiz.current) return
    const ctx = gsap.context(() => {
      const red = sessao.reduzido
      gsap.set('.entrada-letra', { yPercent: red ? 0 : 118, opacity: red ? 1 : 0 })
      const tl = gsap.timeline({ delay: 0.25 })
      tl.to('.entrada-letra', { yPercent: 0, opacity: 1, duration: red ? 0.01 : 1.5, ease: 'expo.out', stagger: { each: 0.028 } })
        .from('.entrada-lema', { opacity: 0, y: 14, duration: 1.2, ease: 'power3.out' }, '-=1.0')
        .from('.entrada-regua', { scaleX: 0, transformOrigin: 'left center', duration: 1.4, ease: 'expo.inOut' }, '-=1.1')
        .from('.entrada-acao, .entrada-rodape > *, .entrada-topo > *', { opacity: 0, y: 10, duration: 1, ease: 'power3.out', stagger: 0.08 }, '-=0.9')
    }, raiz)
    return () => ctx.revert()
  }, [])

  const entrar = () => {
    if (!pronto || fora) return
    setFora(true)
    setAgora(new Date())
    som.iniciar(memoria.som)
    som.toque()
    const ctx = gsap.context(() => {
      gsap.to('.entrada-letra', { yPercent: -110, opacity: 0, duration: 0.9, ease: 'power3.in', stagger: { each: 0.012, from: 'start' } })
      gsap.to('.entrada-lema, .entrada-regua, .entrada-acao, .entrada-rodape, .entrada-topo', { opacity: 0, y: -8, duration: 0.6, ease: 'power2.in' })
      gsap.to('.entrada-veu', { opacity: 0, duration: 2.2, ease: 'power2.inOut', delay: 0.3 })
      gsap.fromTo('.entrada-chegada', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1.2, delay: 1.2, ease: 'power3.out' })
    }, raiz)
    museu()?.entrar()
    window.setTimeout(() => ctx.kill(), 4000)
  }

  const pular = () => museu()?.pular()

  // quando o visitante chega ao átrio, a entrada some
  useEffect(() => {
    if (fase !== 'museu') return
    const id = window.setTimeout(() => setVisivel(false), 900)
    return () => window.clearTimeout(id)
  }, [fase])
  if (!visivel) return null

  const pct = Math.round(carregado * 100)
  const catalogo = String(Math.max(1, Math.round(carregado * 14))).padStart(3, '0')
  const data = agora.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const hora = agora.toLocaleTimeString(lang === 'pt' ? 'pt-BR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
  const visitante = String(memoria.visitas + (fora ? 0 : 1)).padStart(4, '0')
  const ultima = memoria.visitas > 0 ? new Date(memoria.ultimaVisita).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-GB', { day: 'numeric', month: 'long' }) : null

  return (
    <div ref={raiz} className={`entrada ${pronto ? 'pronta' : ''} ${fora ? 'saindo' : ''} ${fase === 'museu' ? 'some' : ''}`}>
      <div className="entrada-veu" />
      <header className="entrada-topo">
        <span className="entrada-marca">Est. 1974</span>
        <div className="entrada-opcoes">
          <button
            className="entrada-opcao"
            onClick={() => {
              mudarMemoria({ som: !somLigado })
              som.definirLigado(!somLigado)
            }}
            aria-pressed={somLigado}
          >
            <span className={`onda ${somLigado ? 'ligada' : ''}`} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            {t('som')} · {somLigado ? t('ligado') : t('desligado')}
          </button>
          <div className="entrada-idiomas" role="group" aria-label={t('idioma')}>
            {(['en', 'pt'] as const).map((l) => (
              <button key={l} className={lang === l ? 'ativo' : ''} onClick={() => mudarMemoria({ lang: l })} aria-pressed={lang === l}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="entrada-centro">
        <h1 className="entrada-titulo">
          <span className="visualmente-oculto">{t('nome')}</span>
          {LINHAS.map((l) => (
            <Letras key={l} texto={l} />
          ))}
        </h1>
        <div className="entrada-regua" />
        <p className="entrada-lema">{t('lema')}</p>
        <div className="entrada-acao">
          <button className="entrar" onClick={entrar} disabled={!pronto} aria-label={pronto ? t('entrar') : `${t('carregando')} ${pct}%`}>
            <span className="entrar-rotulo">{pronto ? t('entrar') : t('carregando')}</span>
            <span className="entrar-linha" aria-hidden="true">
              <span className="entrar-progresso" style={{ transform: `scaleX(${pronto ? 1 : carregado})` }} />
            </span>
            <span className="entrar-seta" aria-hidden="true">
              {pronto ? '→' : `${pct}%`}
            </span>
          </button>
          <span className="entrada-catalogo" aria-hidden="true">
            {pronto ? `Nº 001 — 014` : `Nº ${catalogo} / 014`}
          </span>
        </div>
      </main>

      <footer className="entrada-rodape">
        <span>{ultima ? `${t('voltaDe')} ${ultima}.` : t('comSom')}</span>
        <span>{t('horario')}</span>
      </footer>

      <div className="entrada-chegada" aria-hidden={!fora}>
        <span>{data}</span>
        <span>{hora}</span>
        <span>
          {lang === 'pt' ? 'Visitante' : 'Visitor'} {visitante}
        </span>
      </div>
      {fora && fase === 'chegando' && (
        <button className="entrada-pular" onClick={pular}>
          {t('pular')} <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  )
}
