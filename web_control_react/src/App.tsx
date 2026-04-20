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
        topBarTime,
        powerActionText,
        connect,
        disconnect,
        sendPreset,
        saveUuidSettings,
        resetUuidSettings,
        setUuidField,
    } = useChairController()

    if (!isConnected || screen === 'connect') {
        return (
            <ConnectPage
                uuidSettings={uuidSettings}
                connectionHint={connectionHint}
                txLogs={txLogs}
                isConnecting={isConnecting}
                onFieldChange={setUuidField}
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
            onSendPreset={sendPreset}
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
