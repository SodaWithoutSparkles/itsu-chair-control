import {
    mdiClose,
    mdiHandClap,
    mdiMenu,
    mdiPower,
    mdiTimerOutline,
    mdiWeatherWindy,
} from '@mdi/js'
import { POWER_PRESET } from '../lib/presets'
import type { ChairStatus, CommandPreset, LogEntry, PressurePreference, Screen } from '../types'
import { AutoPage } from './AutoPage'
import { ManualPage } from './ManualPage'
import { PreferencePage } from './PreferencePage'
import { SettingsPage } from './SettingsPage'

type ConnectedPageProps = {
    screen: Screen
    sidebarOpen: boolean
    chairStatus: ChairStatus | null
    deviceName: string
    topBarTime: string
    powerActionText: string
    rxLogs: LogEntry[]
    pressurePreference: PressurePreference
    onSendPreset: (preset: CommandPreset) => Promise<void>
    onSelectPreferredAir: (action: number) => void
    onSelectPreferredPush: (action: number) => void
    onToggleSidebar: () => void
    onCloseSidebar: () => void
    onSelectScreen: (nextScreen: Exclude<Screen, 'connect'>) => void
    onDisconnect: () => void
}

function Icon({ path, className }: { path: string; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path d={path} />
        </svg>
    )
}

export function ConnectedPage({
    screen,
    sidebarOpen,
    chairStatus,
    deviceName,
    topBarTime,
    powerActionText,
    rxLogs,
    pressurePreference,
    onSendPreset,
    onSelectPreferredAir,
    onSelectPreferredPush,
    onToggleSidebar,
    onCloseSidebar,
    onSelectScreen,
    onDisconnect,
}: ConnectedPageProps) {
    return (
        <main className="workspace">
            <aside className={sidebarOpen ? 'sidebar open' : 'sidebar'}>
                <div className="sidebar-head">
                    <h2>Chair Control</h2>
                    <button type="button" className="icon-btn mobile-only" onClick={onCloseSidebar}>
                        <Icon path={mdiClose} />
                    </button>
                </div>

                <nav className="side-nav">
                    <button
                        type="button"
                        className={screen === 'auto' ? 'side-link active' : 'side-link'}
                        onClick={() => onSelectScreen('auto')}
                    >
                        Auto
                    </button>
                    <button
                        type="button"
                        className={screen === 'manual' ? 'side-link active' : 'side-link'}
                        onClick={() => onSelectScreen('manual')}
                    >
                        Manual
                    </button>
                    <button
                        type="button"
                        className={screen === 'settings' ? 'side-link active' : 'side-link'}
                        onClick={() => onSelectScreen('settings')}
                    >
                        Settings
                    </button>
                    <button
                        type="button"
                        className={screen === 'preference' ? 'side-link active' : 'side-link'}
                        onClick={() => onSelectScreen('preference')}
                    >
                        Preference
                    </button>
                </nav>

                <div className="sidebar-bottom">
                    <button
                        type="button"
                        className="power-toggle"
                        onClick={() => void onSendPreset(POWER_PRESET)}
                    >
                        <Icon
                            path={mdiPower}
                            className={chairStatus?.powerOpen ? 'power-icon on' : 'power-icon off'}
                        />
                        <span>{powerActionText}</span>
                    </button>
                    <p className="chair-name">{deviceName}</p>
                    <button type="button" className="ghost-btn" onClick={onDisconnect}>
                        Disconnect
                    </button>
                </div>
            </aside>

            <div className="main-column">
                <header className="topbar">
                    <button type="button" className="icon-btn" onClick={onToggleSidebar}>
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
                    {screen === 'auto' ? (
                        <AutoPage chairStatus={chairStatus} onSendPreset={onSendPreset} />
                    ) : null}
                    {screen === 'manual' ? (
                        <ManualPage chairStatus={chairStatus} onSendPreset={onSendPreset} />
                    ) : null}
                    {screen === 'preference' ? (
                        <PreferencePage
                            pressurePreference={pressurePreference}
                            onSendPreset={onSendPreset}
                            onSelectPreferredAir={onSelectPreferredAir}
                            onSelectPreferredPush={onSelectPreferredPush}
                        />
                    ) : null}
                    {screen === 'settings' ? (
                        <SettingsPage
                            chairStatus={chairStatus}
                            rxLogs={rxLogs}
                            onSendPreset={onSendPreset}
                        />
                    ) : null}
                </section>
            </div>

            {sidebarOpen ? (
                <button type="button" className="backdrop" onClick={onCloseSidebar} />
            ) : null}
        </main>
    )
}
