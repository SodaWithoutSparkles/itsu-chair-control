export type WriteTarget = 'write' | 'alt2' | 'alt3'

export type Screen = 'connect' | 'auto' | 'manual' | 'settings'

export interface UuidSettings {
  serviceUuid: string
  readUuid: string
  writeUuid: string
  altWriteUuid2: string
  altWriteUuid3: string
}

export interface CommandPreset {
  key: string
  label: string
  cmd: number
  action: number
}

export interface ChairStatus {
  powerOpen: boolean
  running: boolean
  bluetoothLinked: boolean
  modeCode: number
  modeName: string
  isAuto: boolean
  autoProgram: number
  remainingMinute: number
  remainingSecond: number
  timerBucket: number
  airPressure: number
  massageStrength: number
  heatState: string
  manualStyle: string
  manualSpeed: number
  manualRegionName: string
  gLevel: number
  pushRod: number
  rawHex: string
  updatedAt: string
}

export interface LogEntry {
  id: number
  text: string
}
