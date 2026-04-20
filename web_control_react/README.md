# Massage Chair Controller (React + Vite + TypeScript)

React Web Bluetooth app for controlling the reverse engineered massage chair protocol.

## Implemented UX

- Connect page
  - Editable UUID settings
  - Save + reset default UUIDs
  - Connect flow that tries primary write UUID first
  - Connection hint tells user to reconnect and adjust UUIDs when primary cannot be used
- Post-connect navigation and layout
  - Mobile-friendly sidebar with Auto / Manual / Settings
  - Sidebar bottom shows power toggle and connected chair name
  - Top bar includes menu button, massage+air status, and remaining time
- Auto page
  - Buttons for all 8 auto modes
  - Shared Air + Massage + Time section
- Manual page
  - Manual style controls
  - Manual speed controls
  - Manual region controls
  - Shared Air + Massage + Time section
- Settings page
  - Heat Off / Low / High
  - Position G controls
  - Rock controls
- Status reflection
  - Active buttons are highlighted using parsed state (power, auto mode, manual speed/region/style, heat, G level, rock, air, massage, timer)
  - RX log intentionally capped to the last 4 extracted frames
  - Frame parser reads a continuous stream and extracts full 0x7E...0x7E frames across chunk boundaries
  - Short empty frames (for example 0x7E 0x7E) are discarded

## UUID Defaults

- Service: 0000fff0-0000-1000-8000-00805f9b34fb
- Read/Notify: 0734594A-A8E7-4B1A-A6B1-CD5243059A57
- Write (primary): 0000fff1-0000-1000-8000-00805f9b34fb
- Alternate 2: 8b00ace7-eb0b-49b0-bbe9-9aee0a26e1a3
- Alternate 3: e06d5efb-4f4a-45c0-9eb1-371ae5a14ad4

## Protocol Compatibility

Send packets use the same rules as the existing reverse engineered CLI:

- 18-byte raw frame with static preamble
- checksum over bytes index 1..17
- escape mapping 7E -> 5E 7D, 5E -> 5E 5D
- first and last escaped bytes forced to 7E
- BLE write in 20-byte chunks

## Run

1. cd web_control_react
2. npm install
3. npm run dev
4. Open http://localhost:5173

Use a Chromium-based browser with Web Bluetooth support.
