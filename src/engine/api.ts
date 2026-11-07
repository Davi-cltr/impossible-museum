// A ponte entre a interface e o motor: um único museu por página.
import type { Museu } from './Museu'

let atual: Museu | null = null

export const definirMuseu = (m: Museu | null) => {
  atual = m
}

export const museu = () => atual
