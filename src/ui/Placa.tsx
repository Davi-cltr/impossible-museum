// A placa da obra diante do visitante: número, título, ficha — e, quando já se sabe,
// a anomalia e a nota do Curador.
import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { GALERIAS, OBRA } from '../content/acervo'
import { useLang } from '../content/textos'
import { mudarSessao, useMuseu } from '../core/estado'

export function Placa() {
  const { id, anomalias, segredos, toque } = useMuseu((s, m) => ({ id: s.obraPerto, anomalias: m.anomalias, segredos: m.segredos, toque: s.toque }))
  const { t, l } = useLang()
  const ref = useRef<HTMLElement>(null)
  const [mostrada, setMostrada] = useState<string | null>(null)
  const [aberta, setAberta] = useState(!toque)

  // troca com saída e entrada
  useLayoutEffect(() => {
    const el = ref.current
    if (id === mostrada) return
    if (!el || !mostrada) {
      setMostrada(id)
      return
    }
    const tw = gsap.to(el, {
      opacity: 0,
      y: 10,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => setMostrada(id),
    })
    return () => {
      tw.kill()
    }
  }, [id, mostrada])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !mostrada) return
    const ctx = gsap.context(() => {
      gsap.set(el, { opacity: 1, y: 0 })
      gsap.fromTo('.placa-anima', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05 })
      gsap.fromTo('.placa-regua', { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.inOut', transformOrigin: 'left center' })
    }, el)
    return () => ctx.revert()
  }, [mostrada])

  if (!mostrada) return null
  const o = OBRA[mostrada]
  const viu = anomalias.includes(mostrada)
  const nota = o.curador && (mostrada === '005' ? segredos.includes('pintura') : mostrada === '002' ? segredos.includes('espelho') : viu)
  return (
    <aside ref={ref} className={`placa ${toque ? 'toque' : ''} ${aberta ? 'aberta' : ''}`} aria-live="polite">
      <div className="placa-cabeca placa-anima">
        <span className="placa-num">
          {t('obra')} {o.id}
        </span>
        <span className="placa-sala">{l(GALERIAS[o.galeria].nome)}</span>
      </div>
      <h2 className="placa-titulo placa-anima">{l(o.titulo)}</h2>
      <p className="placa-meta placa-anima">
        {l(o.classificacao)} <span aria-hidden="true">·</span> {l(o.status)}
      </p>
      <div className="placa-regua" />
      {toque && (
        <button className="placa-mais placa-anima" onClick={() => setAberta(!aberta)} aria-expanded={aberta}>
          {aberta ? '—' : '+'}
        </button>
      )}
      <div className="placa-corpo">
        <p className="placa-desc placa-anima">{l(o.descricao)}</p>
        <dl className="placa-ficha placa-anima">
          {o.ficha.map((f) => (
            <div key={f.k.en}>
              <dt>{l(f.k)}</dt>
              <dd>{l(f.v)}</dd>
            </div>
          ))}
          <div>
            <dt>{t('descoberta')}</dt>
            <dd>{l(o.descoberta)}</dd>
          </div>
        </dl>
        {viu && (
          <p className="placa-anomalia placa-anima">
            <span>{t('observado')}</span>
            {l(o.anomalia)}
          </p>
        )}
        {nota && o.curador && (
          <p className="placa-nota placa-anima">
            <span>{t('notaCurador')}</span>“{l(o.curador)}”
          </p>
        )}
        <button className="placa-link placa-anima" onClick={() => mudarSessao({ painel: 'arquivo', obraArquivo: o.id })}>
          {t('lerMais')} <span aria-hidden="true">→</span>
        </button>
      </div>
    </aside>
  )
}
