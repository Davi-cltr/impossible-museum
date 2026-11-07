// O som do museu, todo sintetizado: tom de sala, reverberação do tamanho de cada espaço,
// passos que mudam com o piso, portas, o tique do relógio, a fita, o sino discreto das
// descobertas — e o silêncio, que também faz parte.
import type { GaleriaId } from '../content/acervo'

export type Piso = 'piso' | 'madeira' | 'nogueira' | 'granilite' | 'travertino' | 'servico' | 'cascalho'

interface Acustica {
  /** duração da cauda (s) */
  rt: number
  /** quanto do som vai para a reverberação */
  molhado: number
  /** tom de sala */
  tom: number
  corte: number
  pad: number
}

const ACUSTICA: Record<string, Acustica> = {
  fora: { rt: 0.6, molhado: 0.06, tom: 0.05, corte: 520, pad: 0 },
  atrio: { rt: 3.3, molhado: 0.42, tom: 0.035, corte: 330, pad: 1 },
  g01: { rt: 1.9, molhado: 0.3, tom: 0.026, corte: 260, pad: 0 },
  g02: { rt: 1.6, molhado: 0.26, tom: 0.026, corte: 240, pad: 0 },
  g03: { rt: 1.9, molhado: 0.3, tom: 0.026, corte: 260, pad: 0 },
  g04: { rt: 1.7, molhado: 0.28, tom: 0.02, corte: 220, pad: 0 },
  g05: { rt: 2.7, molhado: 0.42, tom: 0.003, corte: 160, pad: 0 },
  escada: { rt: 4.2, molhado: 0.5, tom: 0.03, corte: 200, pad: 0 },
  sala004: { rt: 0.55, molhado: 0.16, tom: 0.012, corte: 200, pad: 0 },
  servico: { rt: 1.0, molhado: 0.22, tom: 0.045, corte: 420, pad: 0 },
  s014: { rt: 1.2, molhado: 0.24, tom: 0.014, corte: 180, pad: 0 },
}

export class Som {
  ctx: AudioContext | null = null
  private mestre!: GainNode
  private abafar!: BiquadFilterNode
  private seco!: GainNode
  private envio!: GainNode
  private conv: ConvolverNode[] = []
  private convG: GainNode[] = []
  private convAtivo = 0
  private ruido!: AudioBuffer
  private marrom!: AudioBuffer
  private tomG!: GainNode
  private tomF!: BiquadFilterNode
  private padG!: GainNode
  private fitaG: GainNode | null = null
  private zumbidoG: GainNode | null = null
  private irs = new Map<number, AudioBuffer>()
  private salaAtual = ''
  ligado = true

  iniciar(ligado: boolean) {
    this.ligado = ligado
    if (this.ctx) {
      this.ctx.resume()
      this.definirLigado(ligado)
      return
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC({ latencyHint: 'interactive' })
    this.ctx = ctx
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 3
    comp.attack.value = 0.004
    comp.release.value = 0.25
    this.mestre = ctx.createGain()
    this.mestre.gain.value = 0
    this.abafar = ctx.createBiquadFilter()
    this.abafar.type = 'lowpass'
    this.abafar.frequency.value = 18000
    this.abafar.Q.value = 0.4
    this.seco = ctx.createGain()
    this.envio = ctx.createGain()
    this.seco.connect(this.abafar)
    this.abafar.connect(comp)
    comp.connect(this.mestre)
    this.mestre.connect(ctx.destination)
    for (let i = 0; i < 2; i++) {
      const c = ctx.createConvolver()
      const g = ctx.createGain()
      g.gain.value = i === 0 ? 1 : 0
      this.envio.connect(c)
      c.connect(g)
      g.connect(this.abafar)
      this.conv.push(c)
      this.convG.push(g)
    }
    // ruído branco curto e ruído marrom em laço
    const sr = ctx.sampleRate
    this.ruido = ctx.createBuffer(1, sr * 1.5, sr)
    const d = this.ruido.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    this.marrom = ctx.createBuffer(2, sr * 6, sr)
    for (let ch = 0; ch < 2; ch++) {
      const m = this.marrom.getChannelData(ch)
      let ult = 0
      for (let i = 0; i < m.length; i++) {
        ult = (ult + 0.02 * (Math.random() * 2 - 1)) / 1.02
        m[i] = ult * 3.2
      }
      // emenda sem clique
      const f = sr * 0.05
      for (let i = 0; i < f; i++) m[m.length - f + i] = m[m.length - f + i] * (1 - i / f) + m[i] * (i / f)
    }
    const tom = ctx.createBufferSource()
    tom.buffer = this.marrom
    tom.loop = true
    this.tomF = ctx.createBiquadFilter()
    this.tomF.type = 'lowpass'
    this.tomF.frequency.value = 300
    this.tomG = ctx.createGain()
    this.tomG.gain.value = 0
    tom.connect(this.tomF)
    this.tomF.connect(this.tomG)
    this.tomG.connect(this.seco)
    tom.start()
    // um acorde de quintas, quase inaudível, no átrio
    this.padG = ctx.createGain()
    this.padG.gain.value = 0
    const padF = ctx.createBiquadFilter()
    padF.type = 'lowpass'
    padF.frequency.value = 900
    padF.connect(this.padG)
    this.padG.connect(this.seco)
    this.padG.connect(this.envio)
    for (const [f, g] of [
      [146.83, 0.5],
      [220.0, 0.36],
      [329.63, 0.22],
      [440.0, 0.1],
    ]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      o.detune.value = (Math.random() - 0.5) * 8
      const og = ctx.createGain()
      og.gain.value = g
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.05 + Math.random() * 0.07
      const lg = ctx.createGain()
      lg.gain.value = g * 0.5
      lfo.connect(lg)
      lg.connect(og.gain)
      o.connect(og)
      og.connect(padF)
      o.start()
      lfo.start()
    }
    this.definirLigado(ligado)
    if (this.salaAtual) {
      const s = this.salaAtual
      this.salaAtual = ''
      this.definirSala(s)
    }
  }

  definirLigado(l: boolean) {
    this.ligado = l
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.mestre.gain.cancelScheduledValues(t)
    this.mestre.gain.setTargetAtTime(l ? 0.9 : 0, t, 0.4)
  }

  /** abafa tudo enquanto um painel está aberto (o arquivo é lido em silêncio) */
  abafado(sim: boolean) {
    if (!this.ctx) return
    this.abafar.frequency.setTargetAtTime(sim ? 900 : 18000, this.ctx.currentTime, sim ? 0.25 : 0.6)
  }

  private ir(rt: number) {
    const chave = Math.round(rt * 10)
    const pronto = this.irs.get(chave)
    if (pronto) return pronto
    const ctx = this.ctx!
    const sr = ctx.sampleRate
    const len = Math.floor(sr * rt)
    const b = ctx.createBuffer(2, len, sr)
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch)
      let lp = 0
      const pre = Math.floor(sr * 0.012)
      for (let i = 0; i < len; i++) {
        if (i < pre) {
          d[i] = 0
          continue
        }
        const x = (i - pre) / (len - pre)
        // cauda que escurece com o tempo
        const k = 0.35 + 0.6 * (1 - x)
        lp = lp + k * (Math.random() * 2 - 1 - lp)
        d[i] = lp * Math.pow(1 - x, 2.2) * Math.exp(-x * 2.5)
      }
      // algumas reflexões iniciais
      for (let r = 0; r < 6; r++) {
        const p = pre + Math.floor(sr * (0.008 + Math.random() * 0.05))
        if (p < len) d[p] += (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1)
      }
    }
    this.irs.set(chave, b)
    return b
  }

  definirSala(sala: GaleriaId | 'fora' | string) {
    if (sala === this.salaAtual) return
    this.salaAtual = sala
    if (!this.ctx) return
    const a = ACUSTICA[sala] ?? ACUSTICA.g01
    const t = this.ctx.currentTime
    const proximo = 1 - this.convAtivo
    this.conv[proximo].buffer = this.ir(a.rt)
    this.convG[proximo].gain.setTargetAtTime(1, t, 0.35)
    this.convG[this.convAtivo].gain.setTargetAtTime(0, t, 0.35)
    this.convAtivo = proximo
    this.envio.gain.setTargetAtTime(a.molhado, t, 0.5)
    this.tomG.gain.setTargetAtTime(a.tom, t, 1.2)
    this.tomF.frequency.setTargetAtTime(a.corte, t, 1)
    this.padG.gain.setTargetAtTime(a.pad * 0.016, t, 2.5)
  }

  private saida(pan = 0, molhado = 1) {
    const ctx = this.ctx!
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    p.connect(this.seco)
    if (molhado > 0) {
      const g = ctx.createGain()
      g.gain.value = molhado
      p.connect(g)
      g.connect(this.envio)
    }
    return p
  }

  private pronto() {
    return this.ctx !== null && this.ligado && this.ctx.state === 'running'
  }

  private estalo(t: number, destino: AudioNode, freq: number, q: number, dur: number, ganho: number) {
    const ctx = this.ctx!
    const s = ctx.createBufferSource()
    s.buffer = this.ruido
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(ganho, t + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f)
    f.connect(g)
    g.connect(destino)
    s.start(t, Math.random() * 1.2, dur + 0.05)
  }

  private baque(t: number, destino: AudioNode, f0: number, f1: number, dur: number, ganho: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f1, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(ganho, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(destino)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  passo(piso: Piso, forca = 1, pan = 0, ganho = 1, atraso = 0) {
    if (!this.pronto()) return
    const ctx = this.ctx!
    const t = ctx.currentTime + 0.005 + atraso
    const v = (0.75 + Math.random() * 0.25) * (0.5 + forca * 0.5) * ganho
    const r = 1 + (Math.random() - 0.5) * 0.24
    const out = this.saida(pan + (Math.random() - 0.5) * 0.08)
    const base: Record<Piso, [number, number, number, number]> = {
      // freq do estalo, duração, peso do baque, freq do baque
      piso: [2300, 0.075, 0.22, 95],
      granilite: [3100, 0.06, 0.18, 110],
      travertino: [1800, 0.05, 0.16, 90],
      madeira: [950, 0.12, 0.5, 120],
      nogueira: [900, 0.13, 0.55, 115],
      servico: [1500, 0.045, 0.2, 100],
      cascalho: [2600, 0.16, 0.1, 80],
    }
    const [f, dur, peso, fb] = base[piso]
    // calcanhar
    this.estalo(t, out, f * r, 0.9, dur, 0.09 * v)
    this.baque(t, out, fb * r, 45, 0.07, peso * 0.22 * v)
    // ponta do pé
    this.estalo(t + 0.03 + Math.random() * 0.01, out, f * 1.25 * r, 1.2, dur * 0.7, 0.05 * v)
    if (piso === 'madeira' || piso === 'nogueira') this.estalo(t + 0.004, out, 230 * r, 5, 0.12, 0.05 * v)
    if (piso === 'cascalho') for (let i = 0; i < 4; i++) this.estalo(t + Math.random() * 0.09, out, 3500 + Math.random() * 2500, 2, 0.04, 0.025 * v)
  }

  porta(tipo: 'vidro' | 'madeira' | 'aco' | 'painel', abrindo: boolean) {
    if (!this.pronto()) return
    const ctx = this.ctx!
    const t = ctx.currentTime + 0.01
    const out = this.saida(0, 1)
    if (tipo === 'vidro') {
      const s = ctx.createBufferSource()
      s.buffer = this.ruido
      s.loop = true
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.Q.value = 1.4
      f.frequency.setValueAtTime(abrindo ? 500 : 900, t)
      f.frequency.linearRampToValueAtTime(abrindo ? 1100 : 450, t + 1.1)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.035, t + 0.25)
      g.gain.linearRampToValueAtTime(0.02, t + 0.9)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25)
      s.connect(f)
      f.connect(g)
      g.connect(out)
      s.start(t)
      s.stop(t + 1.3)
      // motor
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = 58
      const of = ctx.createBiquadFilter()
      of.type = 'lowpass'
      of.frequency.value = 160
      const og = ctx.createGain()
      og.gain.setValueAtTime(0, t)
      og.gain.linearRampToValueAtTime(0.012, t + 0.2)
      og.gain.linearRampToValueAtTime(0, t + 1.1)
      o.connect(of)
      of.connect(og)
      og.connect(out)
      o.start(t)
      o.stop(t + 1.2)
      this.baque(t + 1.08, out, 80, 40, 0.12, abrindo ? 0.05 : 0.09)
    } else if (tipo === 'madeira') {
      // rangido: pulsos de uma serra filtrada, com o tom escorregando
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      const base = 150 + Math.random() * 40
      o.frequency.setValueAtTime(base, t)
      o.frequency.linearRampToValueAtTime(base * (abrindo ? 1.5 : 0.75), t + 0.9)
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 1300
      f.Q.value = 9
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      for (let i = 0; i < 14; i++) {
        const ti = t + i * 0.065 + Math.random() * 0.02
        g.gain.setValueAtTime(0.0001, ti)
        g.gain.linearRampToValueAtTime(0.018 * (0.4 + Math.random()), ti + 0.012)
        g.gain.linearRampToValueAtTime(0.0001, ti + 0.05)
      }
      o.connect(f)
      f.connect(g)
      g.connect(out)
      o.start(t)
      o.stop(t + 1.0)
      if (!abrindo) {
        this.estalo(t + 1.25, out, 2600, 4, 0.05, 0.08)
        this.baque(t + 1.25, out, 140, 60, 0.1, 0.12)
      } else this.estalo(t, out, 2400, 5, 0.04, 0.06)
    } else if (tipo === 'painel') {
      this.estalo(t, out, 1900, 3, 0.05, 0.06)
      const s = ctx.createBufferSource()
      s.buffer = this.ruido
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 700
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.03, t + 0.3)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
      s.connect(f)
      f.connect(g)
      g.connect(out)
      s.start(t)
      s.stop(t + 1.2)
    } else {
      // aço: baque grave e um anel metálico
      this.baque(t + (abrindo ? 0 : 1.15), out, 70, 38, 0.35, 0.3)
      for (const fr of [1720, 2630, 3910]) this.estalo(t + (abrindo ? 0 : 1.15), out, fr, 28, 0.9, 0.025)
      this.estalo(t, out, 3000, 6, 0.04, 0.1)
      const s = ctx.createBufferSource()
      s.buffer = this.ruido
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 420
      f.Q.value = 2
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.02, t + 0.4)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
      s.connect(f)
      f.connect(g)
      g.connect(out)
      s.start(t)
      s.stop(t + 1.3)
    }
  }

  trancada() {
    if (!this.pronto()) return
    const t = this.ctx!.currentTime
    const out = this.saida(0, 0.6)
    for (let i = 0; i < 3; i++) {
      this.estalo(t + i * 0.085, out, 2200 + i * 150, 7, 0.06, 0.07)
      this.baque(t + i * 0.085, out, 160, 80, 0.06, 0.06)
    }
  }

  tique(reverso = false, distancia = 1) {
    if (!this.pronto()) return
    const ctx = this.ctx!
    const t = ctx.currentTime + 0.01
    const ganho = 0.08 / Math.max(1, distancia * 0.5)
    const out = this.saida(0, 0.8)
    if (!reverso) {
      this.estalo(t, out, 3600, 7, 0.03, ganho)
      this.baque(t, out, 1900, 1500, 0.04, ganho * 0.4)
      return
    }
    // o tique ao contrário: cresce e corta
    const s = ctx.createBufferSource()
    s.buffer = this.ruido
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 3200
    f.Q.value = 6
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(ganho * 1.2, t + 0.16)
    g.gain.setValueAtTime(0, t + 0.161)
    s.connect(f)
    f.connect(g)
    g.connect(out)
    s.start(t)
    s.stop(t + 0.2)
  }

  /** um sino curto e grave, só para as descobertas */
  sino(alto = false) {
    if (!this.pronto()) return
    const ctx = this.ctx!
    const t = ctx.currentTime + 0.02
    const out = this.saida(0, 2.2)
    const notas = alto ? [587.33, 880] : [659.25]
    notas.forEach((f0, i) => {
      for (const [r, gp] of [
        [1, 1],
        [2.76, 0.4],
        [5.4, 0.18],
        [8.93, 0.08],
      ]) {
        const o = ctx.createOscillator()
        o.frequency.value = f0 * r
        const g = ctx.createGain()
        const ti = t + i * 0.22
        g.gain.setValueAtTime(0, ti)
        g.gain.linearRampToValueAtTime(0.022 * gp, ti + 0.006)
        g.gain.exponentialRampToValueAtTime(0.0001, ti + 2.6 / r ** 0.4)
        o.connect(g)
        g.connect(out)
        o.start(ti)
        o.stop(ti + 3)
      }
    })
  }

  papel() {
    if (!this.pronto()) return
    const t = this.ctx!.currentTime
    const out = this.saida(0, 0.3)
    for (let i = 0; i < 5; i++) this.estalo(t + i * 0.04 + Math.random() * 0.03, out, 2500 + Math.random() * 3500, 1.2, 0.07, 0.03)
  }

  /** um trinco longe, que o visitante não vê */
  trinco() {
    if (!this.pronto()) return
    const t = this.ctx!.currentTime + 0.4
    const out = this.saida(-0.4, 3)
    this.estalo(t, out, 2100, 8, 0.05, 0.035)
    this.baque(t, out, 120, 60, 0.12, 0.05)
    this.estalo(t + 0.18, out, 2800, 10, 0.04, 0.02)
  }

  fita(ligada: boolean) {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    if (ligada && !this.fitaG && this.ligado) {
      const out = this.saida(0, 0.1)
      this.estalo(t, out, 1200, 3, 0.05, 0.12)
      this.baque(t, out, 110, 70, 0.08, 0.1)
      const s = ctx.createBufferSource()
      s.buffer = this.ruido
      s.loop = true
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 5200
      f.Q.value = 0.7
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.012, t + 0.3)
      s.connect(f)
      f.connect(g)
      g.connect(out)
      s.start(t)
      const zum = ctx.createOscillator()
      zum.frequency.value = 60
      const zg = ctx.createGain()
      zg.gain.value = 0.004
      zum.connect(zg)
      zg.connect(g)
      zum.start(t)
      this.fitaG = g
      ;(g as GainNode & { _parar?: () => void })._parar = () => {
        s.stop()
        zum.stop()
      }
    } else if (!ligada && this.fitaG) {
      const g = this.fitaG as GainNode & { _parar?: () => void }
      g.gain.setTargetAtTime(0, t, 0.08)
      const out = this.saida(0, 0.1)
      this.estalo(t, out, 1000, 3, 0.05, 0.1)
      setTimeout(() => g._parar?.(), 600)
      this.fitaG = null
    }
  }

  /** o zumbido grave da passagem */
  zumbido(ligado: boolean) {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    if (ligado && !this.zumbidoG && this.ligado) {
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.05, t + 1.2)
      const osc: OscillatorNode[] = []
      for (const f of [46, 92.5, 139]) {
        const o = ctx.createOscillator()
        o.frequency.value = f
        const og = ctx.createGain()
        og.gain.value = f < 50 ? 1 : 0.25
        o.connect(og)
        og.connect(g)
        o.start(t)
        osc.push(o)
      }
      g.connect(this.seco)
      this.zumbidoG = g
      ;(g as GainNode & { _parar?: () => void })._parar = () => osc.forEach((o) => o.stop())
    } else if (!ligado && this.zumbidoG) {
      const g = this.zumbidoG as GainNode & { _parar?: () => void }
      g.gain.setTargetAtTime(0, t, 0.5)
      setTimeout(() => g._parar?.(), 3000)
      this.zumbidoG = null
    }
  }

  /** um sopro de pressão (a porta do outro lado) */
  sopro() {
    if (!this.pronto()) return
    const ctx = this.ctx!
    const t = ctx.currentTime
    const s = ctx.createBufferSource()
    s.buffer = this.ruido
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(200, t)
    f.frequency.exponentialRampToValueAtTime(1600, t + 0.5)
    f.frequency.exponentialRampToValueAtTime(150, t + 1.4)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.06, t + 0.4)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
    s.connect(f)
    f.connect(g)
    g.connect(this.saida(0, 0.5))
    s.start(t)
    s.stop(t + 1.5)
  }

  /** um livro deslizando na estante e um clique de madeira */
  livro() {
    if (!this.pronto()) return
    const ctx = this.ctx!
    const t = ctx.currentTime
    const out = this.saida(0, 0.4)
    const s = ctx.createBufferSource()
    s.buffer = this.ruido
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 1400
    f.Q.value = 1.2
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.03, t + 0.08)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
    s.connect(f)
    f.connect(g)
    g.connect(out)
    s.start(t)
    s.stop(t + 0.5)
    this.estalo(t + 0.5, out, 900, 4, 0.06, 0.08)
    this.baque(t + 0.5, out, 180, 90, 0.08, 0.08)
  }

  /** um toque de interface, quase nada */
  toque() {
    if (!this.pronto()) return
    const t = this.ctx!.currentTime
    this.estalo(t, this.saida(0, 0), 4200, 3, 0.02, 0.015)
  }
}

export const som = new Som()
