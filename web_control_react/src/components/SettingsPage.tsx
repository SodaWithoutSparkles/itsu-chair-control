import { HEAT_PRESETS, POSITION_G_PRESETS, ROCK_PRESETS } from '../lib/presets'
import type { ChairStatus, CommandPreset, LogEntry } from '../types'

type SettingsPageProps = {
    chairStatus: ChairStatus | null
    rxLogs: LogEntry[]
    onSendPreset: (preset: CommandPreset) => Promise<void>
}

export function SettingsPage({
    chairStatus,
    rxLogs,
    onSendPreset,
}: SettingsPageProps) {
    return (
        <>
            <section className="card-section">
                <h3>Heat</h3>
                <div className="segment-wrap">
                    {HEAT_PRESETS.map((preset) => {
                        const normalized = preset.label.toLowerCase().replace('heat ', '')
                        const isActive = chairStatus?.heatState === normalized
                        return (
                            <button
                                key={preset.key}
                                type="button"
                                className={isActive ? 'segment is-active' : 'segment'}
                                onClick={() => void onSendPreset(preset)}
                            >
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
                            onClick={() => void onSendPreset(preset)}
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
                            className={
                                chairStatus?.pushRod === preset.action ? 'segment is-active' : 'segment'
                            }
                            onClick={() => void onSendPreset(preset)}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </section>

            <section className="card-section compact">
                <h3>Latest Notifications</h3>
                <div className="log-box">
                    {rxLogs.length === 0 ? (
                        <p>No frames yet.</p>
                    ) : (
                        rxLogs.map((log) => <p key={log.id}>{log.text}</p>)
                    )}
                </div>
            </section>
        </>
    )
}
