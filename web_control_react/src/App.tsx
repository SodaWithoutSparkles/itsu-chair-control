import { useCallback, useMemo, useRef, useState } from 'react'
import {
  mdiHandClap,
  mdiMenu,
  mdiPower,
  mdiTimerOutline,
  mdiWeatherWindy,
  mdiClose,
} from '@mdi/js'
import './App.css'
import { decodeStateFrame, extractFramesFromStream } from './lib/decoder'
import {
  AIR_PRESETS,
  AUTO_PRESETS,
  HEAT_PRESETS,
  MANUAL_REGION_PRESETS,
  MANUAL_SPEED_PRESETS,
  MANUAL_STYLE_PRESETS,
  MASSAGE_PRESETS,
  POSITION_G_PRESETS,
  POWER_PRESET,
  ROCK_PRESETS,
  TIMER_PRESETS,
} from './lib/presets'
import { buildSendCmdPacket, bytesToHex } from './lib/protocol'
import type { ChairStatus, CommandPreset, LogEntry, UuidSettings, WriteTarget } from './types'

const STORAGE_KEY = 'chairControl.react.uuidSettings.v1'
const MAX_RX_LOGS = 4

type Screen = 'connect' | 'auto' | 'manual' | 'settings'

type BleRequestDeviceOptions = {
  acceptAllDevices: boolean
  optionalServices?: string[]
}

type BleCharacteristic = {
  value?: DataView | null
  properties: {
    write: boolean
    writeWithoutResponse: boolean
    notify: boolean
    indicate: boolean
  }
  writeValueWithoutResponse: (value: BufferSource) => Promise<void>
  writeValueWithResponse?: (value: BufferSource) => Promise<void>
  writeValue: (value: BufferSource) => Promise<void>
  startNotifications: () => Promise<BleCharacteristic>
  stopNotifications: () => Promise<BleCharacteristic>
  addEventListener: (type: 'characteristicvaluechanged', listener: (event: Event) => void) => void
  removeEventListener: (type: 'characteristicvaluechanged', listener: (event: Event) => void) => void
}

type BleService = {
  getCharacteristic: (uuid: string) => Promise<BleCharacteristic>
}

type BleGattServer = {
  getPrimaryService: (uuid: string) => Promise<BleService>
  connect: () => Promise<BleGattServer>
  disconnect: () => void
  connected: boolean
}

type BleDevice = {
  name?: string
  gatt?: BleGattServer
  addEventListener: (type: 'gattserverdisconnected', listener: () => void) => void
  removeEventListener: (type: 'gattserverdisconnected', listener: () => void) => void
}

type BleNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: BleRequestDeviceOptions) => Promise<BleDevice>
  }
}

type StoredConfig = {
  settings: UuidSettings
  activeWriteTarget: WriteTarget
}

const DEFAULT_UUIDS: UuidSettings = {
  serviceUuid: '0000fff0-0000-1000-8000-00805f9b34fb',
  readUuid: '0734594a-a8e7-4b1a-a6b1-cd5243059a57',
  writeUuid: '0000fff1-0000-1000-8000-00805f9b34fb',
  altWriteUuid2: '8b00ace7-eb0b-49b0-bbe9-9aee0a26e1a3',
  altWriteUuid3: 'e06d5efb-4f4a-45c0-9eb1-371ae5a14ad4',
}

const normalizeUuid = (value: string): string => value.trim().toLowerCase()

const normalizeSettings = (settings: UuidSettings): UuidSettings => ({
  serviceUuid: normalizeUuid(settings.serviceUuid),
  readUuid: normalizeUuid(settings.readUuid),
  writeUuid: normalizeUuid(settings.writeUuid),
  altWriteUuid2: normalizeUuid(settings.altWriteUuid2),
  altWriteUuid3: normalizeUuid(settings.altWriteUuid3),
})

const loadStoredConfig = (): StoredConfig => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { settings: DEFAULT_UUIDS, activeWriteTarget: 'write' }
    }

    const parsed = JSON.parse(raw) as Partial<StoredConfig> & Partial<UuidSettings>
    const fromSettings = parsed.settings ?? parsed

    const settings = normalizeSettings({
      serviceUuid: String(fromSettings.serviceUuid ?? DEFAULT_UUIDS.serviceUuid),
      readUuid: String(fromSettings.readUuid ?? DEFAULT_UUIDS.readUuid),
      writeUuid: String(fromSettings.writeUuid ?? DEFAULT_UUIDS.writeUuid),
      altWriteUuid2: String(fromSettings.altWriteUuid2 ?? DEFAULT_UUIDS.altWriteUuid2),
      altWriteUuid3: String(fromSettings.altWriteUuid3 ?? DEFAULT_UUIDS.altWriteUuid3),
    })

    const activeWriteTarget =
      parsed.activeWriteTarget === 'alt2' || parsed.activeWriteTarget === 'alt3' ? parsed.activeWriteTarget : 'write'

    return { settings, activeWriteTarget }
  } catch {
    return { settings: DEFAULT_UUIDS, activeWriteTarget: 'write' }
  }
}

const nowStamp = (): string => new Date().toLocaleTimeString()

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

const Icon = ({ path, className }: { path: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d={path} />
  </svg>
)

type SharedSectionProps = {
  status: ChairStatus | null
  onSend: (preset: CommandPreset) => Promise<void>
}

function SharedPressureSection({ status, onSend }: SharedSectionProps) {
  return (
    <section className="card-section">
      <h3>Air + Pressure + Time</h3>
      <div className="segment-grid-2x3">
        {AIR_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={status?.airPressure === preset.action ? 'segment is-active' : 'segment'}
            onClick={() => void onSend(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="segment-grid-2x3">
        {MASSAGE_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={status?.massageStrength === preset.action ? 'segment is-active' : 'segment'}
            onClick={() => void onSend(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="segment-wrap">
        {TIMER_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={status?.timerBucket === preset.action ? 'segment is-active' : 'segment'}
            onClick={() => void onSend(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function App() {
  const initialConfigRef = useRef<StoredConfig>(loadStoredConfig())

  const [uuidSettings, setUuidSettings] = useState<UuidSettings>(initialConfigRef.current.settings)
  const [activeWriteTarget, setActiveWriteTarget] = useState<WriteTarget>(initialConfigRef.current.activeWriteTarget)

  const [screen, setScreen] = useState<Screen>('connect')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [deviceName, setDeviceName] = useState('No device selected')
  const [connectionHint, setConnectionHint] = useState(
    'Primary write UUID is tried first. If no response, adjust UUIDs and reconnect.',
  )
  const [chairStatus, setChairStatus] = useState<ChairStatus | null>(null)

  const [txLogs, setTxLogs] = useState<LogEntry[]>([])
  const [rxLogs, setRxLogs] = useState<LogEntry[]>([])

  const deviceRef = useRef<BleDevice | null>(null)
  const readCharRef = useRef<BleCharacteristic | null>(null)
  const writeCharsRef = useRef<Record<WriteTarget, BleCharacteristic | null>>({
    write: null,
    alt2: null,
    alt3: null,
  })
  const notificationHandlerRef = useRef<((event: Event) => void) | null>(null)
  const frameCarryRef = useRef<Uint8Array>(new Uint8Array(0))
  const logCounterRef = useRef(1)

  const appendTx = useCallback((text: string) => {
    const line: LogEntry = {
      id: logCounterRef.current,
      text: `[${nowStamp()}] ${text}`,
    }
    logCounterRef.current += 1
    setTxLogs((previous) => [line, ...previous].slice(0, 20))
  }, [])

  const appendRx = useCallback((text: string) => {
    const line: LogEntry = {
      id: logCounterRef.current,
      text: `[${nowStamp()}] ${text}`,
    }
    logCounterRef.current += 1
    setRxLogs((previous) => [line, ...previous].slice(0, MAX_RX_LOGS))
  }, [])

  const persistConfig = useCallback((settings: UuidSettings, target: WriteTarget) => {
    const normalized = normalizeSettings(settings)
    const payload: StoredConfig = {
      settings: normalized,
      activeWriteTarget: target,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [])

  const setField = (field: keyof UuidSettings, value: string): void => {
    setUuidSettings((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const detachNotifications = useCallback(async () => {
    const readChar = readCharRef.current
    const handler = notificationHandlerRef.current

    if (!readChar || !handler) {
      return
    }

    try {
      readChar.removeEventListener('characteristicvaluechanged', handler)
      await readChar.stopNotifications()
    } catch {
      // Ignore stop failures during disconnect.
    }

    notificationHandlerRef.current = null
  }, [])

  const clearConnectionRefs = useCallback(() => {
    readCharRef.current = null
    writeCharsRef.current = { write: null, alt2: null, alt3: null }
    frameCarryRef.current = new Uint8Array(0)
  }, [])

  const handleDisconnected = useCallback(() => {
    void detachNotifications()

    if (deviceRef.current) {
      deviceRef.current.removeEventListener('gattserverdisconnected', handleDisconnected)
    }

    deviceRef.current = null
    clearConnectionRefs()
    setIsConnected(false)
    setScreen('connect')
    setSidebarOpen(false)
    setDeviceName('No device selected')
    setConnectionHint('Disconnected. Reconnect and try primary write first; adjust UUIDs if needed.')
    appendTx('Disconnected from chair.')
  }, [appendTx, clearConnectionRefs, detachNotifications])

  const tryGetCharacteristic = async (service: BleService, uuid: string): Promise<BleCharacteristic | null> => {
    if (!uuid) {
      return null
    }

    try {
      return await service.getCharacteristic(uuid)
    } catch {
      return null
    }
  }

  const startNotifications = useCallback(
    async (characteristic: BleCharacteristic | null) => {
      if (!characteristic) {
        appendTx('Notify characteristic was not found.')
        return
      }

      if (!characteristic.properties.notify && !characteristic.properties.indicate) {
        appendTx('Notify characteristic does not support notify/indicate.')
        return
      }

      const handler = (event: Event): void => {
        const target = event.target as BleCharacteristic | null
        const value = target?.value
        if (!value) {
          return
        }

        const incoming = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        const extraction = extractFramesFromStream(incoming, frameCarryRef.current)
        frameCarryRef.current = extraction.remainder

        if (extraction.frames.length === 0) {
          return
        }

        let latestStatus: ChairStatus | null = null
        for (const frame of extraction.frames) {
          appendRx(bytesToHex(frame))
          const parsed = decodeStateFrame(frame)
          if (parsed) {
            latestStatus = parsed
          }
        }

        if (latestStatus) {
          setChairStatus(latestStatus)
        }
      }

      characteristic.addEventListener('characteristicvaluechanged', handler)
      notificationHandlerRef.current = handler
      await characteristic.startNotifications()
      appendTx('Notifications enabled.')
    },
    [appendRx, appendTx],
  )

  const connect = useCallback(async () => {
    const bluetooth = (navigator as BleNavigator).bluetooth
    if (!bluetooth) {
      setConnectionHint('This browser does not expose Web Bluetooth. Use a Chromium-based browser on localhost/https.')
      return
    }

    setIsConnecting(true)
    setConnectionHint('Connecting and checking primary write UUID first...')

    try {
      const settings = normalizeSettings(uuidSettings)
      setUuidSettings(settings)
      persistConfig(settings, activeWriteTarget)

      const requestOptions: BleRequestDeviceOptions = {
        acceptAllDevices: true,
        optionalServices: [settings.serviceUuid],
      }

      const device = await bluetooth.requestDevice(requestOptions)
      const gatt = await device.gatt?.connect()
      if (!gatt) {
        throw new Error('GATT connection was not established.')
      }

      const service = await gatt.getPrimaryService(settings.serviceUuid)
      const readChar = await tryGetCharacteristic(service, settings.readUuid)
      const writeChar = await tryGetCharacteristic(service, settings.writeUuid)
      const alt2Char = await tryGetCharacteristic(service, settings.altWriteUuid2)
      const alt3Char = await tryGetCharacteristic(service, settings.altWriteUuid3)

      if (!writeChar && !alt2Char && !alt3Char) {
        throw new Error('No writable characteristic found. Check UUIDs and reconnect.')
      }

      if (deviceRef.current) {
        deviceRef.current.removeEventListener('gattserverdisconnected', handleDisconnected)
      }

      deviceRef.current = device
      device.addEventListener('gattserverdisconnected', handleDisconnected)

      readCharRef.current = readChar
      writeCharsRef.current = {
        write: writeChar,
        alt2: alt2Char,
        alt3: alt3Char,
      }

      const nextTarget: WriteTarget = writeChar ? 'write' : alt2Char ? 'alt2' : 'alt3'
      setActiveWriteTarget(nextTarget)
      persistConfig(settings, nextTarget)

      await startNotifications(readChar)

      setIsConnected(true)
      setScreen('auto')
      setSidebarOpen(false)
      setDeviceName(device.name?.trim() ? device.name : 'Unnamed Chair')

      if (writeChar) {
        setConnectionHint('Connected on primary write UUID.')
      } else {
        setConnectionHint('Primary write UUID not found. Connected via alternate write UUID.')
      }

      appendTx(`Connected to ${device.name || 'Unnamed Chair'}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown connection error'
      setConnectionHint(`Connection failed: ${message}`)
      appendTx(`Connection failed: ${message}`)
      handleDisconnected()
    } finally {
      setIsConnecting(false)
    }
  }, [activeWriteTarget, appendTx, handleDisconnected, persistConfig, startNotifications, uuidSettings])

  const disconnect = useCallback(() => {
    const device = deviceRef.current
    if (!device) {
      handleDisconnected()
      return
    }

    if (device.gatt?.connected) {
      device.gatt.disconnect()
      return
    }

    handleDisconnected()
  }, [handleDisconnected])

  const activeWriteCharacteristic = useCallback((): BleCharacteristic | null => {
    const preferred = writeCharsRef.current[activeWriteTarget]
    if (preferred) {
      return preferred
    }

    if (writeCharsRef.current.write) {
      return writeCharsRef.current.write
    }

    if (writeCharsRef.current.alt2) {
      return writeCharsRef.current.alt2
    }

    return writeCharsRef.current.alt3
  }, [activeWriteTarget])

  const writePacket = useCallback(async (characteristic: BleCharacteristic, packet: Uint8Array) => {
    for (let offset = 0; offset < packet.length; offset += 20) {
      const chunk = packet.slice(offset, Math.min(offset + 20, packet.length))
      if (characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk)
      } else if (characteristic.properties.write && characteristic.writeValueWithResponse) {
        await characteristic.writeValueWithResponse(chunk)
      } else {
        await characteristic.writeValue(chunk)
      }
      await wait(25)
    }
  }, [])

  const sendPreset = useCallback(
    async (preset: CommandPreset) => {
      if (!isConnected) {
        appendTx('Not connected. Connect first.')
        return
      }

      const characteristic = activeWriteCharacteristic()
      if (!characteristic) {
        setConnectionHint('No active write characteristic available. Disconnect and adjust UUIDs on connect page.')
        appendTx('Send failed: no active write characteristic.')
        return
      }

      try {
        const packet = buildSendCmdPacket(preset.cmd, preset.action)
        await writePacket(characteristic, packet)

        // Some chairs occasionally miss single strength updates, so repeat massage level writes once.
        if (preset.key.startsWith('massage_')) {
          await wait(60)
          await writePacket(characteristic, packet)
        }

        appendTx(`${preset.label} sent | ${bytesToHex(packet)}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown send error'
        appendTx(`Send failed for ${preset.label}: ${message}`)
      }
    },
    [activeWriteCharacteristic, appendTx, isConnected, writePacket],
  )

  const saveUuidSettings = (): void => {
    const normalized = normalizeSettings(uuidSettings)
    setUuidSettings(normalized)
    persistConfig(normalized, activeWriteTarget)
    appendTx('UUID settings saved.')
  }

  const resetUuidSettings = (): void => {
    setUuidSettings(DEFAULT_UUIDS)
    setActiveWriteTarget('write')
    persistConfig(DEFAULT_UUIDS, 'write')
    appendTx('UUID settings reset to defaults.')
  }

  const topBarTime = useMemo(() => {
    if (!chairStatus) {
      return '--:--'
    }
    return `${chairStatus.remainingMinute}:${String(chairStatus.remainingSecond).padStart(2, '0')}`
  }, [chairStatus])

  const powerActionText = chairStatus?.powerOpen ? 'Tap to turn OFF' : 'Tap to turn ON'

  const renderAutoPage = () => (
    <>
      <section className="card-section">
        <h3>Auto Mode</h3>
        <div className="segment-wrap">
          {AUTO_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={chairStatus?.autoProgram === preset.action ? 'segment is-active' : 'segment'}
              onClick={() => void sendPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>
      <SharedPressureSection status={chairStatus} onSend={sendPreset} />
    </>
  )

  const renderManualPage = () => (
    <>
      <section className="card-section">
        <h3>Manual Style</h3>
        <div className="segment-wrap">
          {MANUAL_STYLE_PRESETS.map((preset) => {
            const styleMap: Record<string, string> = {
              manual_knead: 'knead',
              manual_tap: 'tap',
              manual_knead_tap: 'knead_tap',
              manual_shiatsu: 'shiatsu',
              manual_roll: 'roll',
            }
            const isActive = chairStatus?.manualStyle === styleMap[preset.key]
            return (
              <button key={preset.key} type="button" className={isActive ? 'segment is-active' : 'segment'} onClick={() => void sendPreset(preset)}>
                {preset.label}
              </button>
            )
          })}
        </div>

        <h4>Manual Speed</h4>
        <div className="segment-wrap">
          {MANUAL_SPEED_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={chairStatus?.manualSpeed === preset.action ? 'segment is-active' : 'segment'}
              onClick={() => void sendPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <h4>Manual Region</h4>
        <div className="segment-wrap">
          {MANUAL_REGION_PRESETS.map((preset) => {
            const isActive = chairStatus?.manualRegionName === preset.label.toLowerCase()
            return (
              <button key={preset.key} type="button" className={isActive ? 'segment is-active' : 'segment'} onClick={() => void sendPreset(preset)}>
                {preset.label}
              </button>
            )
          })}
        </div>
      </section>
      <SharedPressureSection status={chairStatus} onSend={sendPreset} />
    </>
  )

  const renderSettingsPage = () => (
    <>
      <section className="card-section">
        <h3>Heat</h3>
        <div className="segment-wrap">
          {HEAT_PRESETS.map((preset) => {
            const normalized = preset.label.toLowerCase().replace('heat ', '')
            const isActive = chairStatus?.heatState === normalized
            return (
              <button key={preset.key} type="button" className={isActive ? 'segment is-active' : 'segment'} onClick={() => void sendPreset(preset)}>
                {preset.label}
              </button>
            )
          })}
        </div>
      </section>

      <section className="card-section">
        <h3>Position G</h3>
        <div className="segment-wrap">
          {POSITION_G_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={chairStatus?.gLevel === preset.action ? 'segment is-active' : 'segment'}
              onClick={() => void sendPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card-section">
        <h3>Rock</h3>
        <div className="segment-wrap">
          {ROCK_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={chairStatus?.pushRod === preset.action ? 'segment is-active' : 'segment'}
              onClick={() => void sendPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card-section compact">
        <h3>Latest Notifications</h3>
        <div className="log-box">
          {rxLogs.length === 0 ? <p>No frames yet.</p> : rxLogs.map((log) => <p key={log.id}>{log.text}</p>)}
        </div>
      </section>
    </>
  )

  const renderConnectedPage = () => (
    <main className="workspace">
      <aside className={sidebarOpen ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-head">
          <h2>Chair Control</h2>
          <button type="button" className="icon-btn mobile-only" onClick={() => setSidebarOpen(false)}>
            <Icon path={mdiClose} />
          </button>
        </div>

        <nav className="side-nav">
          <button type="button" className={screen === 'auto' ? 'side-link active' : 'side-link'} onClick={() => { setScreen('auto'); setSidebarOpen(false) }}>
            Auto
          </button>
          <button type="button" className={screen === 'manual' ? 'side-link active' : 'side-link'} onClick={() => { setScreen('manual'); setSidebarOpen(false) }}>
            Manual
          </button>
          <button type="button" className={screen === 'settings' ? 'side-link active' : 'side-link'} onClick={() => { setScreen('settings'); setSidebarOpen(false) }}>
            Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button type="button" className="power-toggle" onClick={() => void sendPreset(POWER_PRESET)}>
            <Icon path={mdiPower} className={chairStatus?.powerOpen ? 'power-icon on' : 'power-icon off'} />
            <span>{powerActionText}</span>
          </button>
          <p className="chair-name">{deviceName}</p>
          <button type="button" className="ghost-btn" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button type="button" className="icon-btn" onClick={() => setSidebarOpen((value) => !value)}>
            <Icon path={mdiMenu} />
          </button>

          <div className="pressure-summary">
            <span>
              <Icon path={mdiHandClap} className="summary-icon" />
              {chairStatus?.massageStrength ?? '--'}
            </span>
            <span>
              <Icon path={mdiWeatherWindy} className="summary-icon" />
              {chairStatus?.airPressure ?? '--'}
            </span>
          </div>

          <div className="time-pill">
            <Icon path={mdiTimerOutline} className="summary-icon" />
            {topBarTime}
          </div>
        </header>

        <section className="content-area">
          {screen === 'auto' && renderAutoPage()}
          {screen === 'manual' && renderManualPage()}
          {screen === 'settings' && renderSettingsPage()}
        </section>
      </div>

      {sidebarOpen ? <button type="button" className="backdrop" onClick={() => setSidebarOpen(false)} /> : null}
    </main>
  )

  if (!isConnected || screen === 'connect') {
    return (
      <main className="connect-shell">
        <section className="connect-card">
          <p className="eyebrow">Chair Bluetooth</p>
          <h1>Connect</h1>
          <p className="hint">{connectionHint}</p>

          <div className="connect-grid">
            <label>
              Service UUID
              <input value={uuidSettings.serviceUuid} onChange={(event) => setField('serviceUuid', event.target.value)} />
            </label>
            <label>
              Read / Notify UUID
              <input value={uuidSettings.readUuid} onChange={(event) => setField('readUuid', event.target.value)} />
            </label>
            <label>
              Primary Write UUID
              <input value={uuidSettings.writeUuid} onChange={(event) => setField('writeUuid', event.target.value)} />
            </label>
            <label>
              Alternate Write UUID 2
              <input value={uuidSettings.altWriteUuid2} onChange={(event) => setField('altWriteUuid2', event.target.value)} />
            </label>
            <label>
              Alternate Write UUID 3
              <input value={uuidSettings.altWriteUuid3} onChange={(event) => setField('altWriteUuid3', event.target.value)} />
            </label>
          </div>

          <div className="connect-actions">
            <button type="button" className="ghost-btn" disabled={isConnecting} onClick={saveUuidSettings}>
              Save
            </button>
            <button type="button" className="ghost-btn" disabled={isConnecting} onClick={resetUuidSettings}>
              Reset
            </button>
            <button type="button" className="primary-btn" disabled={isConnecting} onClick={() => void connect()}>
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>

          <div className="log-box">
            {txLogs.length === 0 ? <p>No activity yet.</p> : txLogs.map((log) => <p key={log.id}>{log.text}</p>)}
          </div>
        </section>
      </main>
    )
  }

  return renderConnectedPage()
}

export default App
