import './App.css'
import { ConnectPage } from './components/ConnectPage'
import { ConnectedPage } from './components/ConnectedPage'
import { useChairController } from './hooks/useChairController'

function App() {
    const {
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
    } = useChairController()

    if (!isConnected || screen === 'connect') {
        return (
            <ConnectPage
                uuidSettings={uuidSettings}
                connectionHint={connectionHint}
                txLogs={txLogs}
                isConnecting={isConnecting}
                deviceNameFilter={deviceNameFilter}
                onFieldChange={setUuidField}
                onDeviceNameFilterChange={setDeviceNameFilter}
                onSave={saveUuidSettings}
                onReset={resetUuidSettings}
                onConnect={connect}
            />
        )
    }

    return (
        <ConnectedPage
            screen={screen}
            sidebarOpen={sidebarOpen}
            chairStatus={chairStatus}
            deviceName={deviceName}
            topBarTime={topBarTime}
            powerActionText={powerActionText}
            rxLogs={rxLogs}
            pressurePreference={pressurePreference}
            onSendPreset={sendPreset}
            onSelectPreferredAir={setPreferredAirAction}
            onSelectPreferredPush={setPreferredMassageAction}
            onToggleSidebar={() => setSidebarOpen((value) => !value)}
            onCloseSidebar={() => setSidebarOpen(false)}
            onSelectScreen={(nextScreen) => {
                setScreen(nextScreen)
                setSidebarOpen(false)
            }}
            onDisconnect={disconnect}
        />
    )
}

export default App
