// Avisos discretos no canto: obra observada, documento achado, algo mudou.
import { useMuseu } from '../core/estado'

export function Avisos() {
  const avisos = useMuseu((s) => s.avisos)
  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.slice(-3).map((a) => (
        <p key={a.id} className={`aviso aviso-${a.tipo}`}>
          <span className="aviso-traco" aria-hidden="true" />
          {a.texto}
        </p>
      ))}
    </div>
  )
}
