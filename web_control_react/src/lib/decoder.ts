import type { ChairStatus } from '../types'
import { bytesToHex } from './protocol'

type ByteArray = Uint8Array<ArrayBufferLike>

const FRAME_DELIMITER = 0x7e
const ESCAPE_PREFIX = 0x5e
const ESCAPED_7E = 0x7d
const ESCAPED_5E = 0x5d

const toU8 = (value: number): number => value & 0xff

const timerBucketNowrist = (remainingMinute: number): number => {
  if (remainingMinute >= 15) {
    return 20
  }
  if (remainingMinute >= 10) {
    return 15
  }
  if (remainingMinute >= 5) {
    return 10
  }
  if (remainingMinute > 0) {
    return 5
  }
  return 0
}

const modeName = (mode: number): string => {
  if (mode === 1) {
    return 'manual'
  }
  if (mode === 2) {
    return 'auto_or_program'
  }
  if (mode === 3) {
    return 'other'
  }
  return 'idle_or_unknown'
}

const regionName = (code: number): string => {
  if (code === 1) {
    return 'neck'
  }
  if (code === 2) {
    return 'shoulder'
  }
  if (code === 4) {
    return 'back'
  }
  if (code === 8) {
    return 'waist'
  }
  if (code === 16) {
    return 'buttock'
  }
  if (code === 31) {
    return 'full'
  }
  return 'unknown'
}

const heatName = (b40: number): string => {
  const low2 = b40 & 0x03
  const high2 = (b40 >> 4) & 0x03
  const tempType = low2 | high2
  if (tempType === 0) {
    return 'off'
  }
  if (tempType === 1) {
    return 'low'
  }
  if (tempType === 3) {
    return 'high'
  }
  return `unknown(${tempType})`
}

const inferManualStyle = (b27: number, b28: number): string => {
  if (b27 === 49) {
    return 'roll'
  }
  if (b28 === 21 || b28 === 22) {
    return 'shiatsu'
  }
  if (b28 === 19 || b28 === 20) {
    return 'clap'
  }
  if (b28 === 18) {
    return 'knead_tap'
  }
  if (b27 === 17 || b27 === 18) {
    return 'knead'
  }
  if (b28 === 17) {
    return 'tap'
  }
  return 'unknown'
}

const deescapeBytes = (data: ByteArray): Uint8Array => {
  const output: number[] = []
  let index = 0

  while (index < data.length) {
    const value = data[index]
    if (value === ESCAPE_PREFIX && index + 1 < data.length) {
      const next = data[index + 1]
      if (next === ESCAPED_7E) {
        output.push(FRAME_DELIMITER)
        index += 2
        continue
      }
      if (next === ESCAPED_5E) {
        output.push(ESCAPE_PREFIX)
        index += 2
        continue
      }
    }
    output.push(value)
    index += 1
  }

  return new Uint8Array(output)
}

const concatBytes = (first: ByteArray, second: ByteArray): Uint8Array => {
  const merged = new Uint8Array(first.length + second.length)
  merged.set(first, 0)
  merged.set(second, first.length)
  return merged
}

export type FrameExtractionResult = {
  frames: ByteArray[]
  remainder: Uint8Array
}

export const extractFramesFromStream = (incoming: ByteArray, carry: ByteArray = new Uint8Array(0)): FrameExtractionResult => {
  const merged = concatBytes(carry, incoming)
  const frames: ByteArray[] = []

  let cursor = 0
  while (cursor < merged.length) {
    while (cursor < merged.length && merged[cursor] !== FRAME_DELIMITER) {
      cursor += 1
    }

    if (cursor >= merged.length) {
      break
    }

    const start = cursor
    cursor += 1

    while (cursor < merged.length && merged[cursor] !== FRAME_DELIMITER) {
      cursor += 1
    }

    if (cursor >= merged.length) {
      return {
        frames,
        remainder: merged.slice(start),
      }
    }

    const end = cursor
    const candidate = merged.slice(start, end + 1)

    if (candidate.length > 2) {
      frames.push(candidate)
    }

    // Keep current delimiter as possible start of next frame.
    cursor = end
  }

  return {
    frames,
    remainder: new Uint8Array(0),
  }
}

export const decodeStateFrame = (frame: ByteArray): ChairStatus | null => {
  const deescaped = deescapeBytes(frame)
  if (deescaped.length < 48) {
    return null
  }

  const messageIndex9 = deescaped[9]
  const messageIndex10 = deescaped[10]
  if (messageIndex10 !== 0x00 || messageIndex9 !== 0x01) {
    return null
  }

  const checksumExpected = deescaped.slice(1, -2).reduce((sum, value) => toU8(sum + value), 0)
  const checksumActual = deescaped[deescaped.length - 2]
  if (checksumExpected !== checksumActual) {
    return null
  }

  const b = (index: number): number => toU8(index < deescaped.length ? deescaped[index] : 0)

  const sysByte = b(14)
  const modeBits = b(29) & 0x03

  return {
    powerOpen: (sysByte & 0x01) === 1,
    running: ((sysByte >> 1) & 0x01) === 0,
    bluetoothLinked: ((b(41) >> 3) & 0x01) === 1,
    modeCode: modeBits,
    modeName: modeName(modeBits),
    isAuto: modeBits !== 1,
    autoProgram: b(37),
    remainingMinute: b(18),
    remainingSecond: b(19),
    timerBucket: timerBucketNowrist(b(18)),
    airPressure: b(33),
    massageStrength: b(26) & 0x0f,
    heatState: heatName(b(40)),
    manualStyle: inferManualStyle(b(27), b(28)),
    manualSpeed: b(26) & 0x0f,
    manualRegionName: regionName(b(30)),
    gLevel: (b(36) >> 6) & 0x03,
    pushRod: b(42) & 0x03,
    rawHex: bytesToHex(deescaped),
    updatedAt: new Date().toLocaleTimeString(),
  }
}
