// O cursor do museu: um anel que segue o mouse com mola e diz o que se pode fazer.
import { useEffect, useRef } from 'react'
import { sessao, useMuseu } from '../core/estado'

export function Cursor() {
  const ref = useRef<HTMLDivElement>(null)
  const { alvo, fase, painel, toque } = useMuseu((s) => ({ alvo: s.alvo, fase: s.fase, painel: s.painel, toque: s.toque }))

  useEffect(() => {
    if (toque) return
    const el = ref.current
    if (!el) return
    let x = innerWidth / 2
    let y = innerHeight / 2
    let cx = x
    let cy = y
    let raf = 0
    let sobreCanvas = false
    const mover = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      sobreCanvas = (e.target as HTMLElement)?.classList?.contains('palco')
      el.classList.toggle('visivel', sobreCanvas && sessao.fase === 'museu' && sessao.painel === 'nenhum')
      el.classList.toggle('arrastando', (e.buttons & 1) === 1 && sobreCanvas)
    }
    const laco = () => {
      raf = requestAnimationFrame(laco)
      const k = sessao.reduzido ? 1 : 0.28
      cx += (x - cx) * k
      cy += (y - cy) * k
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerdown', mover)
    window.addEventListener('pointerup', mover)
    raf = requestAnimationFrame(laco)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerdown', mover)
      window.removeEventListener('pointerup', mover)
    }
  }, [toque])

  if (toque) return null
  const ativo = fase === 'museu' && painel === 'nenhum'
  return (
    <div ref={ref} className="cursor" data-tipo={ativo ? (alvo?.tipo ?? 'nada') : 'nada'} aria-hidden="true">
      <span className="cursor-anel" />
      <span className="cursor-ponto" />
      <span className={`cursor-rotulo ${ativo && alvo ? 'visivel' : ''}`}>{alvo?.rotulo ?? ''}</span>
    </div>
  )
}
