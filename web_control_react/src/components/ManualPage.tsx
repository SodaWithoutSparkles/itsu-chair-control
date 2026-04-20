import {
    MANUAL_REGION_PRESETS,
    MANUAL_SPEED_PRESETS,
    MANUAL_STYLE_PRESETS,
} from '../lib/presets'
import type { ChairStatus, CommandPreset } from '../types'
import { SharedPressureSection } from './SharedPressureSection'

type ManualPageProps = {
    chairStatus: ChairStatus | null
    onSendPreset: (preset: CommandPreset) => Promise<void>
}

const STYLE_MAP: Record<string, string> = {
    manual_knead: 'knead',
    manual_tap: 'tap',
    manual_knead_tap: 'knead_tap',
    manual_shiatsu: 'shiatsu',
    manual_roll: 'roll',
}

export function ManualPage({ chairStatus, onSendPreset }: ManualPageProps) {
    return (
        <>
            <section className="card-section">
                <h3>Manual Style</h3>
                <div className="segment-wrap">
                    {MANUAL_STYLE_PRESETS.map((preset) => {
                        const isActive = chairStatus?.manualStyle === STYLE_MAP[preset.key]
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

                <h4>Manual Speed</h4>
                <div className="segment-wrap">
                    {MANUAL_SPEED_PRESETS.map((preset) => (
                        <button
                            key={preset.key}
                            type="button"
                            className={
                                chairStatus?.manualSpeed === preset.action ? 'segment is-active' : 'segment'
                            }
                            onClick={() => void onSendPreset(preset)}
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

            <SharedPressureSection status={chairStatus} onSend={onSendPreset} />
        </>
    )
}
