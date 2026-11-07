// Ao entrar numa galeria, o título dela aparece grande e some — como um intertítulo.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { GALERIAS, type GaleriaId } from '../content/acervo'
import { useLang } from '../content/textos'
import { useMuseu } from '../core/estado'

const COM_TITULO: GaleriaId[] = ['g01', 'g02', 'g03', 'g04', 'g05', 'escada', 'sala004', 'servico', 's014']

export function TituloSala() {
  const { sala, fase } = useMuseu((s) => ({ sala: s.sala, fase: s.fase }))
  const { t, l } = useLang()
  const [atual, setAtual] = useState<GaleriaId | null>(null)
  const vistos = useRef(new Map<string, number>())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (fase !== 'museu' || !COM_TITULO.includes(sala)) return
    const antes = vistos.current.get(sala) ?? -1e9
    const agora = performance.now()
    vistos.current.set(sala, agora)
    // não repete o mesmo título em menos de meio minuto
    if (agora - antes < 30000) return
    setAtual(sala)
  }, [sala, fase])

  useLayoutEffect(() => {
    if (!atual || !ref.current) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => setAtual(null) })
      tl.fromTo('.ts-num', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' })
        .fromTo('.ts-palavra', { yPercent: 105 }, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07 }, 0.1)
        .fromTo('.ts-regua', { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.inOut' }, 0.2)
        .fromTo('.ts-sub', { opacity: 0 }, { opacity: 1, duration: 1 }, 0.6)
        .to('.ts-palavra', { yPercent: -105, duration: 0.9, ease: 'power3.in', stagger: 0.04 }, 3.6)
        .to('.ts-num, .ts-sub, .ts-regua', { opacity: 0, duration: 0.6 }, 3.7)
    }, ref)
    return () => ctx.revert()
  }, [atual])

  if (!atual) return null
  const g = GALERIAS[atual]
  const num = atual.startsWith('g') ? `${t('exposicao')} ${g.numero}` : atual === 's014' ? '014' : g.numero ? `${t('obra')} ${g.sub.en.replace(/\D/g, '')}` : ''
  return (
    <div className="titulo-sala" ref={ref} aria-hidden="true">
      {num && <span className="ts-num">{num}</span>}
      <h2 className="ts-titulo">
        {l(g.nome)
          .split(' ')
          .map((p, i) => (
            <span key={i} className="ts-mascara">
              <span className="ts-palavra">{p}</span>
            </span>
          ))}
      </h2>
      <span className="ts-regua" />
      <span className="ts-sub">{l(g.sub)}</span>
    </div>
  )
}
