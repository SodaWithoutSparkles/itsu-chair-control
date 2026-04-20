import { AUTO_PRESETS } from '../lib/presets'
import type { ChairStatus, CommandPreset } from '../types'
import { SharedPressureSection } from './SharedPressureSection'

type AutoPageProps = {
    chairStatus: ChairStatus | null
    onSendPreset: (preset: CommandPreset) => Promise<void>
}

export function AutoPage({ chairStatus, onSendPreset }: AutoPageProps) {
    return (
        <>
            <section className="card-section">
                <h3>Auto Mode</h3>
                <div className="segment-wrap">
                    {AUTO_PRESETS.map((preset) => (
                        <button
                            key={preset.key}
                            type="button"
                            className={
                                chairStatus?.autoProgram === preset.action ? 'segment is-active' : 'segment'
                            }
                            onClick={() => void onSendPreset(preset)}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </section>

            <SharedPressureSection status={chairStatus} onSend={onSendPreset} />
        </>
    )
}
