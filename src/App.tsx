// A página: o palco 3D atrás e a interface por cima (entrada, cabeçalho, placas, painéis).
import { lazy, Suspense, useEffect, useRef } from 'react'
import { memoria, mudarSessao, sessao, useMuseu } from './core/estado'
import { definirMuseu, museu } from './engine/api'
import { Entrada } from './ui/Entrada'
import { Hud } from './ui/Hud'
import { Placa } from './ui/Placa'
import { Avisos } from './ui/Avisos'
import { Cursor } from './ui/Cursor'
import { TituloSala } from './ui/TituloSala'
import { SemGL } from './ui/SemGL'

const Paineis = lazy(() => import('./ui/Paineis'))

function webglDisponivel() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function App() {
  const hospede = useRef<HTMLDivElement>(null)
  const { fase, pronto, painel, falhaGL, reduzido, lang } = useMuseu((s, m) => ({
    fase: s.fase,
    pronto: s.pronto,
    painel: s.painel,
    falhaGL: s.falhaGL,
    reduzido: s.reduzido,
    lang: m.lang,
  }))

  useEffect(() => {
    if (!hospede.current || museu()) return
    if (!webglDisponivel()) {
      mudarSessao({ falhaGL: true })
      return
    }
    let cancelado = false
    import('./engine/Museu')
      .then(({ Museu }) => {
        if (cancelado) return
        const m = new Museu(hospede.current!)
        definirMuseu(m)
        ;(window as unknown as { __museu: unknown }).__museu = m.depurar()
        return m.iniciar((p) => mudarSessao({ carregado: p }))
      })
      .catch((e) => {
        console.error(e)
        mudarSessao({ falhaGL: true })
      })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'
    document.title = lang === 'pt' ? 'The Impossible Museum — o museu impossível' : 'The Impossible Museum'
    museu()?.aoMudarIdioma()
  }, [lang])

  useEffect(() => {
    museu()?.painelAberto(painel !== 'nenhum')
  }, [painel])

  useEffect(() => {
    museu()?.definirReduzido(reduzido)
  }, [reduzido])

  // atalhos: M planta, I arquivo, Esc fecha
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (sessao.fase !== 'museu') return
      const alvo = e.target as HTMLElement
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA')) return
      if (e.code === 'Escape' && sessao.painel !== 'nenhum') {
        mudarSessao({ painel: 'nenhum', documento: null })
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === 'KeyM') mudarSessao({ painel: sessao.painel === 'mapa' ? 'nenhum' : 'mapa' })
      if (e.code === 'KeyI') mudarSessao({ painel: sessao.painel === 'arquivo' ? 'nenhum' : 'arquivo' })
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const classes = ['app', pronto && 'pronto', fase === 'museu' && 'museu-ativo', reduzido && 'reduzido', painel !== 'nenhum' && 'com-painel'].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      <div className="hospede" ref={hospede} />
      {falhaGL ? (
        <SemGL />
      ) : (
        <>
          <TituloSala />
          {fase === 'museu' && <Hud />}
          {fase === 'museu' && <Placa />}
          <Entrada />
          <Avisos />
          <Suspense fallback={null}>{painel !== 'nenhum' && <Paineis />}</Suspense>
          <Cursor />
        </>
      )}
      {memoria.qualidade !== 'baixa' && <div className="grao" aria-hidden="true" />}
    </div>
  )
}
