import {
    AIR_PRESETS,
    MASSAGE_PRESETS,
    TIMER_PRESETS,
} from '../lib/presets'
import type { ChairStatus, CommandPreset } from '../types'

type SharedPressureSectionProps = {
    status: ChairStatus | null
    onSend: (preset: CommandPreset) => Promise<void>
}

export function SharedPressureSection({
    status,
    onSend,
}: SharedPressureSectionProps) {
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
                        className={
                            status?.massageStrength === preset.action ? 'segment is-active' : 'segment'
                        }
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
