# itsu-chair-control

A reverse-engineered interface for controlling the ITSU massage chair (model IS6028). The reference BLE command format is derived from dumped HCI logs and captured traffic from the `com.dqiot.tool.yushou` android app version `1.98`.

This repository contains:

- `chair_cli/` – a Python CLI for generating and decoding BLE command frames derived from the IS6028 model.
- `web_control_react/` – a React + Vite Web Bluetooth control panel for the chair.
- `reverse/` – reference artifacts and captured protocol material used to derive the command format.

## Project Summary

This project reproduces the massage chair's BLE command protocol so the chair can be controlled from custom tools. It is based on reverse engineering from dumped HCI logs and captured chair traffic.

### Key capabilities

- Build valid BLE command packets for the IS6028 massage chair.
- Decode inbound chair frames to extract state and status.
- Support known preset commands for auto programs, manual massage controls, heat, air pressure, time, position, and more.
- Provide a browser-based UI for connecting to the chair over Web Bluetooth.

## Repository Layout

- `chair_cli/`
  - `cli.py` – CLI entrypoint and command definitions.
  - `protocol.py` – packet construction, checksum, and escape logic.
  - `decoder.py` – inbound frame parsing and model state decoding.
  - `presets.py` – reverse-engineered preset command definitions.
  - `README.md` – detailed CLI usage and protocol notes.
- `web_control_react/`
  - React app implementing a Web Bluetooth control UI.
  - `package.json` and Vite configuration for local development.
- `reverse/`
  - Captured protocol reference material used to derive the packet format.

## Python CLI Usage

The Python CLI is pure standard-library Python and can be run directly from the repository root.

### Run examples

```bash
python -m chair_cli list-presets
python -m chair_cli list-presets --group manual
python -m chair_cli preset auto_3 --raw
python -m chair_cli encode --cmd 0x8C --action 0x03
python -m chair_cli sequence actions_txt
```

### Semantic setters

```bash
python -m chair_cli set time 20
python -m chair_cli set air 4
python -m chair_cli set massage 3
python -m chair_cli set heat high
python -m chair_cli set position rocker1
python -m chair_cli set manual_style knead
python -m chair_cli set manual_speed 5
python -m chair_cli set manual_region shoulder
python -m chair_cli set auto 3
```

### Decode inbound frames

```bash
python -m chair_cli decode --hex "7E 00 32 01 ... 7E"
python -m chair_cli decode --file serial.log --json --show-hex
```

## Web App Usage

The web app is located in `web_control_react/`.

### Run locally

```bash
cd web_control_react
npm install
npm run dev
```

Open the local Vite URL shown in the console (typically `http://localhost:5173`).

### Browser requirements

- Use a Chromium-based browser with Web Bluetooth support.
- Allow Bluetooth device access when prompted.

## Protocol Notes

This project mirrors the chair's native packet format:

- 18-byte raw command frame with a static preamble.
- Checksum is computed over bytes 1..17 and stored in byte 16.
- Escape rules mirror the observed chair protocol captured in HCI traffic:
  - `0x7E` → `0x5E 0x7D`
  - `0x5E` → `0x5E 0x5D`
- The first and last bytes of the escaped payload are set to `0x7E` before BLE transmission.
- Multiple LLM were heavily used to reverse engineer the command format from captured traffic. Including but not limited to gemini, chatgpt, and more.

## Notes

- The `reverse/` folder is reference material and is not required to run the CLI or web app.
- The CLI focuses on IS6028 command and status decoding for the ITSU chair.

## Contribution

If you extend this project, keep the protocol logic in `chair_cli/protocol.py` aligned with the captured protocol reference material.
You may need to dump additional HCI logs, or even consider decompiling the source APK (e.g. using jadx) to understand new commands or status frames.

## Disclaimer

This project is an independent reverse engineering effort and is not affiliated with ITSU or any official product. Use at your own risk. Author(s) of this project is not responsible for any damage to the chair or injury resulting from misuse. Always test commands with caution and ensure you understand their effects before sending them to the chair. Author(s) do not have access to the chair's official command documentation, so all commands are derived from observed behavior and may not be fully comprehensive or accurate.
