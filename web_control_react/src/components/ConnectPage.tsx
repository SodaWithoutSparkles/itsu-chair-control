import type { LogEntry, UuidSettings } from '../types'

type ConnectPageProps = {
    uuidSettings: UuidSettings
    connectionHint: string
    txLogs: LogEntry[]
    isConnecting: boolean
    deviceNameFilter: string
    onFieldChange: (field: keyof UuidSettings, value: string) => void
    onDeviceNameFilterChange: (value: string) => void
    onSave: () => void
    onReset: () => void
    onConnect: () => Promise<void>
}

export function ConnectPage({
    uuidSettings,
    connectionHint,
    txLogs,
    isConnecting,
    deviceNameFilter,
    onFieldChange,
    onDeviceNameFilterChange,
    onSave,
    onReset,
    onConnect,
}: ConnectPageProps) {
    return (
        <main className="connect-shell">
            <section className="connect-card">
                <p className="eyebrow">Chair Bluetooth</p>
                <h1>Connect</h1>
                <p className="hint">{connectionHint}</p>

                <div className="connect-grid">
                    <label>
                        Service UUID
                        <input
                            value={uuidSettings.serviceUuid}
                            onChange={(event) => onFieldChange('serviceUuid', event.target.value)}
                        />
                    </label>
                    <label>
                        Read / Notify UUID
                        <input
                            value={uuidSettings.readUuid}
                            onChange={(event) => onFieldChange('readUuid', event.target.value)}
                        />
                    </label>
                    <label>
                        Primary Write UUID
                        <input
                            value={uuidSettings.writeUuid}
                            onChange={(event) => onFieldChange('writeUuid', event.target.value)}
                        />
                    </label>
                    <label>
                        Alternate Write UUID 2
                        <input
                            value={uuidSettings.altWriteUuid2}
                            onChange={(event) => onFieldChange('altWriteUuid2', event.target.value)}
                        />
                    </label>
                    <label>
                        Alternate Write UUID 3
                        <input
                            value={uuidSettings.altWriteUuid3}
                            onChange={(event) => onFieldChange('altWriteUuid3', event.target.value)}
                        />
                    </label>
                    <label>
                        Device Name Prefix Filter
                        <input
                            placeholder="Leave empty to show all nearby devices"
                            value={deviceNameFilter}
                            onChange={(event) => onDeviceNameFilterChange(event.target.value)}
                        />
                    </label>
                </div>

                <div className="connect-actions">
                    <button type="button" className="ghost-btn" disabled={isConnecting} onClick={onSave}>
                        Save
                    </button>
                    <button type="button" className="ghost-btn" disabled={isConnecting} onClick={onReset}>
                        Reset
                    </button>
                    <button
                        type="button"
                        className="primary-btn"
                        disabled={isConnecting}
                        onClick={() => void onConnect()}
                    >
                        {isConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                </div>

                <div className="log-box">
                    {txLogs.length === 0 ? (
                        <p>No activity yet.</p>
                    ) : (
                        txLogs.map((log) => <p key={log.id}>{log.text}</p>)
                    )}
                </div>
            </section>
        </main>
    )
}
