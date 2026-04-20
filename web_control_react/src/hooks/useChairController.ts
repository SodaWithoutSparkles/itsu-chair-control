import { useCallback, useMemo, useRef, useState } from 'react'
import { decodeStateFrame, extractFramesFromStream } from '../lib/decoder'
import { AIR_PRESETS, MASSAGE_PRESETS } from '../lib/presets'
import { buildSendCmdPacket, bytesToHex } from '../lib/protocol'
import type {
    ChairStatus,
    CommandPreset,
    LogEntry,
    PressurePreference,
    Screen,
    UuidSettings,
    WriteTarget,
} from '../types'

const STORAGE_KEY = 'chairControl.react.uuidSettings.v1'
const PREFERENCE_STORAGE_KEY = 'chairControl.react.preference.v1'
const DEVICE_FILTER_STORAGE_KEY = 'chairControl.react.deviceFilter.v1'
const MAX_RX_LOGS = 4

const DEFAULT_PRESSURE_PREFERENCE: PressurePreference = {
    airAction: AIR_PRESETS[0]?.action ?? 0x01,
    massageAction: MASSAGE_PRESETS[0]?.action ?? 0x01,
}

const DEFAULT_DEVICE_NAME_PREFIX_FILTER = 'IS'

const isValidAirAction = (action: number): boolean =>
    AIR_PRESETS.some((preset) => preset.action === action)

const isValidMassageAction = (action: number): boolean =>
    MASSAGE_PRESETS.some((preset) => preset.action === action)

const getPreferredAirPreset = (action: number): CommandPreset =>
    AIR_PRESETS.find((preset) => preset.action === action) ?? AIR_PRESETS[0]

const getPreferredMassagePreset = (action: number): CommandPreset =>
    MASSAGE_PRESETS.find((preset) => preset.action === action) ?? MASSAGE_PRESETS[0]

const loadStoredPreference = (): PressurePreference => {
    try {
        const raw = window.localStorage.getItem(PREFERENCE_STORAGE_KEY)
        if (!raw) {
            return DEFAULT_PRESSURE_PREFERENCE
        }

        const parsed = JSON.parse(raw) as Partial<PressurePreference>
        const airAction = Number(parsed.airAction)
        const massageAction = Number(parsed.massageAction)

        return {
            airAction: isValidAirAction(airAction)
                ? airAction
                : DEFAULT_PRESSURE_PREFERENCE.airAction,
            massageAction: isValidMassageAction(massageAction)
                ? massageAction
                : DEFAULT_PRESSURE_PREFERENCE.massageAction,
        }
    } catch {
        return DEFAULT_PRESSURE_PREFERENCE
    }
}

const loadStoredDeviceFilter = (): string => {
    try {
        const raw = window.localStorage.getItem(DEVICE_FILTER_STORAGE_KEY)
        const normalized = raw ? String(raw).trim() : ''
        return normalized || DEFAULT_DEVICE_NAME_PREFIX_FILTER
    } catch {
        return DEFAULT_DEVICE_NAME_PREFIX_FILTER
    }
}

type BleRequestDeviceFilter = {
    name?: string
    namePrefix?: string
    services?: string[]
}

type BleRequestDeviceOptions = {
    acceptAllDevices: boolean
    optionalServices?: string[]
    filters?: BleRequestDeviceFilter[]
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
    addEventListener: (
        type: 'characteristicvaluechanged',
        listener: (event: Event) => void,
    ) => void
    removeEventListener: (
        type: 'characteristicvaluechanged',
        listener: (event: Event) => void,
    ) => void
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
            parsed.activeWriteTarget === 'alt2' || parsed.activeWriteTarget === 'alt3'
                ? parsed.activeWriteTarget
                : 'write'

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

export function useChairController() {
    const initialConfigRef = useRef<StoredConfig>(loadStoredConfig())
    const initialPreferenceRef = useRef<PressurePreference>(loadStoredPreference())
    const initialDeviceFilterRef = useRef<string>(loadStoredDeviceFilter())

    const [uuidSettings, setUuidSettings] = useState<UuidSettings>(
        initialConfigRef.current.settings,
    )
    const [activeWriteTarget, setActiveWriteTarget] = useState<WriteTarget>(
        initialConfigRef.current.activeWriteTarget,
    )
    const [pressurePreference, setPressurePreference] = useState<PressurePreference>(
        initialPreferenceRef.current,
    )
    const [deviceNameFilter, setDeviceNameFilterState] = useState<string>(
        initialDeviceFilterRef.current,
    )

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

    const setUuidField = useCallback((field: keyof UuidSettings, value: string): void => {
        setUuidSettings((previous) => ({
            ...previous,
            [field]: value,
        }))
    }, [])

    const setDeviceNameFilter = useCallback((value: string): void => {
        setDeviceNameFilterState(value)
        window.localStorage.setItem(DEVICE_FILTER_STORAGE_KEY, value)
    }, [])

    const setPreferredAirAction = useCallback((action: number): void => {
        if (!isValidAirAction(action)) {
            return
        }

        setPressurePreference((previous) => {
            const next = {
                ...previous,
                airAction: action,
            }
            window.localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(next))
            return next
        })
        appendTx(`Preference saved: Air ${action}.`)
    }, [appendTx])

    const setPreferredMassageAction = useCallback((action: number): void => {
        if (!isValidMassageAction(action)) {
            return
        }

        setPressurePreference((previous) => {
            const next = {
                ...previous,
                massageAction: action,
            }
            window.localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(next))
            return next
        })
        appendTx(`Preference saved: Push ${action}.`)
    }, [appendTx])

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

    const tryGetCharacteristic = async (
        service: BleService,
        uuid: string,
    ): Promise<BleCharacteristic | null> => {
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
            setConnectionHint(
                'This browser does not expose Web Bluetooth. Use a Chromium-based browser on localhost/https.',
            )
            return
        }

        setIsConnecting(true)
        const normalizedFilter = deviceNameFilter.trim()
        if (normalizedFilter) {
            setConnectionHint(
                `Connecting with device name prefix filter "${normalizedFilter}" and checking primary write UUID first...`,
            )
        } else {
            setConnectionHint('Connecting and checking primary write UUID first...')
        }

        try {
            const settings = normalizeSettings(uuidSettings)
            setUuidSettings(settings)
            persistConfig(settings, activeWriteTarget)

            const requestOptions: BleRequestDeviceOptions = normalizedFilter
                ? {
                    acceptAllDevices: false,
                    filters: [{ namePrefix: normalizedFilter }],
                    optionalServices: [settings.serviceUuid],
                }
                : {
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
            let alt2Char: BleCharacteristic | null = null
            let alt3Char: BleCharacteristic | null = null

            // Primary write UUID found: skip alternate UUID probes to speed up connect.
            if (!writeChar) {
                alt2Char = await tryGetCharacteristic(service, settings.altWriteUuid2)
                if (!alt2Char) {
                    alt3Char = await tryGetCharacteristic(service, settings.altWriteUuid3)
                }
            }

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
    }, [activeWriteTarget, appendTx, deviceNameFilter, handleDisconnected, persistConfig, startNotifications, uuidSettings])

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

                if (preset.key.startsWith('auto_')) {
                    const preferredAirPreset = getPreferredAirPreset(pressurePreference.airAction)
                    const preferredMassagePreset = getPreferredMassagePreset(
                        pressurePreference.massageAction,
                    )

                    await wait(80)
                    const airPacket = buildSendCmdPacket(
                        preferredAirPreset.cmd,
                        preferredAirPreset.action,
                    )
                    await writePacket(characteristic, airPacket)

                    await wait(80)
                    const pushPacket = buildSendCmdPacket(
                        preferredMassagePreset.cmd,
                        preferredMassagePreset.action,
                    )
                    await writePacket(characteristic, pushPacket)
                    await wait(60)
                    await writePacket(characteristic, pushPacket)

                    appendTx(
                        `Auto preference applied: Air ${preferredAirPreset.action}, Push ${preferredMassagePreset.action}.`,
                    )
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown send error'
                appendTx(`Send failed for ${preset.label}: ${message}`)
            }
        },
        [activeWriteCharacteristic, appendTx, isConnected, pressurePreference, writePacket],
    )

    const saveUuidSettings = useCallback((): void => {
        const normalized = normalizeSettings(uuidSettings)
        setUuidSettings(normalized)
        persistConfig(normalized, activeWriteTarget)
        appendTx('UUID settings saved.')
    }, [activeWriteTarget, appendTx, persistConfig, uuidSettings])

    const resetUuidSettings = useCallback((): void => {
        setUuidSettings(DEFAULT_UUIDS)
        setActiveWriteTarget('write')
        persistConfig(DEFAULT_UUIDS, 'write')
        appendTx('UUID settings reset to defaults.')
    }, [appendTx, persistConfig])

    const topBarTime = useMemo(() => {
        if (!chairStatus) {
            return '--:--'
        }
        return `${chairStatus.remainingMinute}:${String(chairStatus.remainingSecond).padStart(2, '0')}`
    }, [chairStatus])

    const powerActionText = chairStatus?.powerOpen ? 'Tap to turn OFF' : 'Tap to turn ON'

    return {
        screen,
        setScreen,
        sidebarOpen,
        setSidebarOpen,
        isConnected,
        isConnecting,
        deviceName,
        connectionHint,
        chairStatus,
        txLogs,
        rxLogs,
        uuidSettings,
        deviceNameFilter,
        pressurePreference,
        topBarTime,
        powerActionText,
        connect,
        disconnect,
        sendPreset,
        saveUuidSettings,
        resetUuidSettings,
        setUuidField,
        setDeviceNameFilter,
        setPreferredAirAction,
        setPreferredMassageAction,
    }
}
