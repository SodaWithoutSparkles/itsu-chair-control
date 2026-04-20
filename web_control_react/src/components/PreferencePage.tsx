import { AIR_PRESETS, MASSAGE_PRESETS } from '../lib/presets'
import type { CommandPreset, PressurePreference } from '../types'

type PreferencePageProps = {
    pressurePreference: PressurePreference
    onSendPreset: (preset: CommandPreset) => Promise<void>
    onSelectPreferredAir: (action: number) => void
    onSelectPreferredPush: (action: number) => void
}

export function PreferencePage({
    pressurePreference,
    onSendPreset,
    onSelectPreferredAir,
    onSelectPreferredPush,
}: PreferencePageProps) {
    const currentPreferenceLabel = `Air ${pressurePreference.airAction} | Push ${pressurePreference.massageAction}`

    return (
        <>
            <section className="card-section">
                <h3>Auto Preferences</h3>
                <p className="preference-note">
                    Saved profile: <strong>{currentPreferenceLabel}</strong>
                </p>
                <p className="preference-note">
                    Choose your default levels below. These will be re-applied every time you start an
                    Auto program.
                </p>

                <h4>Preferred Air Level</h4>
                <div className="segment-grid-2x3">
                    {AIR_PRESETS.map((preset) => (
                        <button
                            key={preset.key}
                            type="button"
                            className={
                                pressurePreference.airAction === preset.action
                                    ? 'segment is-active'
                                    : 'segment'
                            }
                            onClick={() => {
                                onSelectPreferredAir(preset.action)
                                void onSendPreset(preset)
                            }}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                <h4>Preferred Push Level</h4>
                <div className="segment-grid-2x3">
                    {MASSAGE_PRESETS.map((preset) => (
                        <button
                            key={preset.key}
                            type="button"
                            className={
                                pressurePreference.massageAction === preset.action
                                    ? 'segment is-active'
                                    : 'segment'
                            }
                            onClick={() => {
                                onSelectPreferredPush(preset.action)
                                void onSendPreset(preset)
                            }}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </section>
        </>
    )
}
