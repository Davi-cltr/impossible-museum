// O que fica sobre a visita: onde você está, o arquivo, a planta, os ajustes,
// as dicas da primeira vez e, no celular, os controles do passeio.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { GALERIAS, OBRAS } from '../content/acervo'
import { useLang } from '../content/textos'
import { mudarSessao, useMuseu } from '../core/estado'
import { museu } from '../engine/api'
import { som } from '../core/som'

function nivelRotulo(n: number) {
  return n >= 1 ? String(n) : `B${1 - n}`
}

function Sala() {
  const { sala, nivel } = useMuseu((s) => ({ sala: s.sala, nivel: s.nivel }))
  const { t, l } = useLang()
  const g = GALERIAS[sala]
  const ref = useRef<HTMLDivElement>(null)
  const chave = `${sala}:${sala === 'escada' ? nivel : ''}`
  useLayoutEffect(() => {
    if (!ref.current) return
    const tw = gsap.fromTo(ref.current.children, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06 })
    return () => {
      tw.kill()
    }
  }, [chave])
  const numero = sala === 'escada' ? `${t('nivel')} ${nivelRotulo(nivel)}` : g.numero ? (sala.startsWith('g') ? `${t('exposicao')} ${g.numero}` : g.numero) : ''
  return (
    <div className="hud-sala" aria-live="polite">
      <div className="hud-sala-mascara" ref={ref} key={chave}>
        {numero && <span className="hud-sala-num">{numero}</span>}
        <span className="hud-sala-nome">{l(g.nome)}</span>
      </div>
    </div>
  )
}

function Dicas() {
  const { toque, perto } = useMuseu((s) => ({ toque: s.toque, perto: s.obraPerto }))
  const { t } = useLang()
  const [vis, setVis] = useState(true)
  useEffect(() => {
    const id = window.setTimeout(() => setVis(false), 11000)
    return () => window.clearTimeout(id)
  }, [])
  return (
    <div className={`hud-dicas ${vis && !perto ? '' : 'some'}`} aria-hidden={!vis}>
      {toque ? (
        <span>{t('dicaToque')}</span>
      ) : (
        <>
          <span>{t('dicaDesk')}</span>
          <span>{t('dicaDesk2')}</span>
        </>
      )}
    </div>
  )
}

function Passeio({ toque }: { toque: boolean }) {
  const { sala, tour } = useMuseu((s) => ({ sala: s.sala, tour: s.tour }))
  const { t } = useLang()
  return (
    <nav className="passeio" aria-label="Tour">
      {sala === 'escada' && (
        <div className="passeio-escada">
          <button onClick={() => museu()?.escada(1)}>
            <span aria-hidden="true">↑</span> {t('subir')}
          </button>
          <button onClick={() => museu()?.escada(-1)}>
            <span aria-hidden="true">↓</span> {t('descer')}
          </button>
        </div>
      )}
      {toque && (
        <div className="passeio-barra">
          <button className="passeio-seta" onClick={() => museu()?.tour(-1)} aria-label={t('anterior')}>
            <span aria-hidden="true">←</span>
          </button>
          <span className="passeio-n">{String(tour + 1).padStart(2, '0')}</span>
          <button className="passeio-seta" onClick={() => museu()?.tour(1)} aria-label={t('proxima')}>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </nav>
  )
}

export function Hud() {
  const { toque, observadas, achadas, painel, sala } = useMuseu((s, m) => ({ toque: s.toque, observadas: m.obras.length, achadas: m.achadas.length, painel: s.painel, sala: s.sala }))
  const { t } = useLang()
  const raiz = useRef<HTMLDivElement>(null)
  const total = OBRAS.length
  const conhecidas = OBRAS.filter((o) => !o.oculta).length + achadas
  useLayoutEffect(() => {
    if (!raiz.current) return
    const ctx = gsap.context(() => {
      gsap.from('.hud-topo > *, .hud-dicas, .passeio', { opacity: 0, y: -8, duration: 1.2, ease: 'power3.out', stagger: 0.1, delay: 0.2 })
    }, raiz)
    return () => ctx.revert()
  }, [])
  const abrir = (p: 'arquivo' | 'mapa' | 'ajustes') => {
    som.toque()
    mudarSessao({ painel: painel === p ? 'nenhum' : p })
  }
  return (
    <div className="hud" ref={raiz}>
      <header className="hud-topo">
        <div className="hud-esq">
          <span className="hud-marca">The Impossible Museum</span>
          <Sala />
        </div>
        <nav className="hud-dir" aria-label="Menu">
          <button className="hud-botao" onClick={() => abrir('mapa')} aria-keyshortcuts="M">
            <span>{t('mapa')}</span>
            {!toque && <kbd>M</kbd>}
          </button>
          <button className="hud-botao" onClick={() => abrir('arquivo')} aria-keyshortcuts="I">
            <span>{t('arquivo')}</span>
            <span className="hud-conta">
              {conhecidas}/{total}
              <i style={{ transform: `scaleX(${observadas / total})` }} />
            </span>
            {!toque && <kbd>I</kbd>}
          </button>
          <button className="hud-botao hud-ajustes" onClick={() => abrir('ajustes')} aria-label={t('ajustes')}>
            <span className="hud-pontos" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>
        </nav>
      </header>
      <Dicas />
      {(toque || sala === 'escada') && <Passeio toque={toque} />}
    </div>
  )
}
