// Sem WebGL: o museu não abre, mas o arquivo continua disponível.
import { OBRAS } from '../content/acervo'
import { useLang } from '../content/textos'
import { mudarMemoria } from '../core/estado'

export function SemGL() {
  const { t, l, lang } = useLang()
  return (
    <div className="semgl">
      <header>
        <h1>{t('nome')}</h1>
        <p>{t('lema')}</p>
        <div className="entrada-idiomas">
          {(['en', 'pt'] as const).map((x) => (
            <button key={x} className={lang === x ? 'ativo' : ''} onClick={() => mudarMemoria({ lang: x })}>
              {x.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      <p className="semgl-aviso">{t('semGL')}</p>
      <ol>
        {OBRAS.filter((o) => !o.oculta).map((o) => (
          <li key={o.id}>
            <span className="semgl-num">{o.id}</span>
            <h2>{l(o.titulo)}</h2>
            <p className="semgl-meta">
              {l(o.classificacao)} · {l(o.descoberta)}
            </p>
            <p>{l(o.descricao)}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
