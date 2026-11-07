// O visitante: posição dos pés, olhar, passos, o andar da escada e o deslizar por caminhos.
import * as THREE from 'three'
import { noHallEscada, type Bloco } from './mundo'
import { mover } from './navegacao'
import { ESCADA } from './planta'

export const OLHOS = 1.62
const H = ESCADA.H

const angulo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export interface Seguir {
  pontos: [number, number][]
  velocidade?: number
  yawFinal?: number
  pitchFinal?: number
  aoChegar?: () => void
  /** gira o olhar para a direção do caminho */
  olharCaminho?: boolean
}

export class Jogador {
  readonly pos = new THREE.Vector3(0, 0, 27)
  yaw = 0
  pitch = 0
  alvoYaw = 0
  alvoPitch = 0
  nivel = 1
  /** velocidade atual no plano (m/s) */
  velocidade = 0
  readonly vel = new THREE.Vector2()
  /** congelado (cinematográficas, painéis) */
  preso = false
  reduzido = false
  teclas = new Set<string>()
  roda = 0
  private camY = OLHOS
  private andando = false
  private fase = 0
  private ultimoArraste = -10
  private tempo = 0
  private seguindo: (Seguir & { i: number; parado: number }) | null = null
  aoPasso?: (forca: number) => void
  aoNivel?: (nivel: number, antes: number) => void
  aoParar?: () => void

  get caminhando() {
    return this.seguindo !== null
  }

  arrastar(dx: number, dy: number, sens = 0.0042) {
    this.alvoYaw += dx * sens
    this.alvoPitch = THREE.MathUtils.clamp(this.alvoPitch + dy * sens, -1.15, 1.15)
    this.ultimoArraste = this.tempo
  }

  olharPara(yaw: number, pitch = 0) {
    // escolhe o giro mais curto
    this.alvoYaw = this.yaw + angulo(yaw - this.yaw)
    this.alvoPitch = pitch
  }

  posicionar(x: number, z: number, yaw: number, pitch = 0, y = 0) {
    this.pos.set(x, y, z)
    this.yaw = this.alvoYaw = yaw
    this.pitch = this.alvoPitch = pitch
    this.camY = y + OLHOS
    this.seguindo = null
  }

  seguir(s: Seguir) {
    if (s.pontos.length < 2) {
      if (s.yawFinal !== undefined) this.olharPara(s.yawFinal, s.pitchFinal ?? 0)
      s.aoChegar?.()
      this.seguindo = null
      return
    }
    this.seguindo = { ...s, i: 1, parado: 0 }
  }

  parar() {
    this.seguindo = null
  }

  /** desloca o visitante (a passagem para a Sala 014) sem suavizar nada */
  saltar(dx: number) {
    this.pos.x += dx
    if (this.seguindo) this.seguindo.pontos = this.seguindo.pontos.map(([x, z]) => [x + dx, z])
  }

  atualizar(dt: number, blocos: Bloco[], camera: THREE.PerspectiveCamera) {
    this.tempo += dt
    let dirX = 0
    let dirZ = 0
    let alvoVel = 0
    const t = this.teclas
    const frente = (t.has('KeyW') || t.has('ArrowUp') ? 1 : 0) - (t.has('KeyS') || t.has('ArrowDown') ? 1 : 0) + this.roda
    const lado = (t.has('KeyD') ? 1 : 0) - (t.has('KeyA') ? 1 : 0)
    const giro = (t.has('ArrowLeft') ? 1 : 0) - (t.has('ArrowRight') ? 1 : 0)
    this.roda *= Math.exp(-dt * 6)
    if (Math.abs(this.roda) < 0.02) this.roda = 0
    if (giro) this.alvoYaw += giro * dt * 1.6
    if (!this.preso && (frente || lado)) {
      this.seguindo = null
      const sy = Math.sin(this.yaw)
      const cy = Math.cos(this.yaw)
      // frente = (-sen, -cos); direita = (cos, -sen)
      dirX = -sy * frente + cy * lado
      dirZ = -cy * frente - sy * lado
      const n = Math.hypot(dirX, dirZ) || 1
      dirX /= n
      dirZ /= n
      alvoVel = t.has('ShiftLeft') || t.has('ShiftRight') ? 3.4 : 1.9
    }
    if (!this.preso && this.seguindo) {
      const s = this.seguindo
      const [tx, tz] = s.pontos[s.i]
      const dx = tx - this.pos.x
      const dz = tz - this.pos.z
      const d = Math.hypot(dx, dz)
      // distância que falta até o fim, para frear com suavidade
      let resto = d
      for (let k = s.i; k < s.pontos.length - 1; k++) resto += Math.hypot(s.pontos[k + 1][0] - s.pontos[k][0], s.pontos[k + 1][1] - s.pontos[k][1])
      const vmax = s.velocidade ?? 1.9
      alvoVel = Math.min(vmax, Math.sqrt(2 * 1.5 * resto) + 0.05)
      if (d > 1e-4) {
        dirX = dx / d
        dirZ = dz / d
      }
      if (d < Math.max(0.12, this.velocidade * dt * 1.5)) {
        if (s.i < s.pontos.length - 1) s.i++
        else {
          this.seguindo = null
          if (s.yawFinal !== undefined) this.olharPara(s.yawFinal, s.pitchFinal ?? 0)
          s.aoChegar?.()
          alvoVel = 0
        }
      }
      // olhar acompanha o caminho (a menos que o visitante esteja olhando em volta)
      if (this.seguindo && (s.olharCaminho ?? true) && this.tempo - this.ultimoArraste > 1.4) {
        if (resto > 2.2) {
          const y = Math.atan2(-dirX, -dirZ)
          this.alvoYaw = this.yaw + angulo(y - this.yaw)
          this.alvoPitch *= 1 - Math.min(1, dt * 1.5)
        } else if (s.yawFinal !== undefined) this.olharPara(s.yawFinal, s.pitchFinal ?? 0)
      }
    }
    // aceleração suave
    const a = Math.min(1, dt * (alvoVel > this.velocidade ? 5 : 7))
    const vx = dirX * alvoVel
    const vz = dirZ * alvoVel
    this.vel.x += (vx - this.vel.x) * a
    this.vel.y += (vz - this.vel.y) * a
    if (this.preso) this.vel.set(0, 0)
    let andou = 0
    if (this.vel.lengthSq() > 1e-6) {
      andou = mover(this.pos, this.vel.x * dt, this.vel.y * dt, blocos)
      if (this.seguindo && andou < this.vel.length() * dt * 0.2) {
        this.seguindo.parado += dt
        if (this.seguindo.parado > 0.7) this.seguindo = null
      } else if (this.seguindo) this.seguindo.parado = 0
    }
    this.velocidade = dt > 0 ? andou / dt : 0
    // parou de andar (com histerese, para a desaceleração suave também contar)
    if (this.velocidade > 0.6) this.andando = true
    else if (this.andando && this.velocidade < 0.08) {
      this.andando = false
      this.aoParar?.()
    }

    // escada infinita: o visitante fica sempre no módulo do meio; muda só o número do andar
    if (noHallEscada(this.pos.x, this.pos.z)) {
      if (this.pos.y > 0.6 * H) {
        this.pos.y -= H
        this.camY -= H
        const n = this.nivel++
        this.aoNivel?.(this.nivel, n)
      } else if (this.pos.y < -0.4 * H) {
        this.pos.y += H
        this.camY += H
        const n = this.nivel--
        this.aoNivel?.(this.nivel, n)
      }
    }

    // passos
    if (andou > 0) {
      this.fase += andou / 0.75
      if (this.fase >= 1) {
        this.fase -= 1
        this.aoPasso?.(Math.min(1, this.velocidade / 1.9))
      }
    }

    // olhar com amortecimento
    const k = 1 - Math.exp(-dt * 11)
    this.yaw += (this.alvoYaw - this.yaw) * k
    this.pitch += (this.alvoPitch - this.pitch) * k
    // câmera: altura suave (escada), balanço discreto ao andar
    const alvoY = this.pos.y + OLHOS
    this.camY += (alvoY - this.camY) * (1 - Math.exp(-dt * 14))
    const bal = this.reduzido ? 0 : Math.min(1, this.velocidade / 1.9)
    const fase = this.fase * Math.PI * 2
    const bob = Math.sin(fase) * 0.016 * bal
    const lado2 = Math.cos(fase * 0.5) * 0.012 * bal
    camera.position.set(this.pos.x + Math.cos(this.yaw) * lado2, this.camY + bob, this.pos.z - Math.sin(this.yaw) * lado2)
    camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
  }
}
