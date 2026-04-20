import type { CommandPreset } from '../types'

export const POWER_PRESET: CommandPreset = { key: 'power_toggle', label: 'Power', cmd: 0x01, action: 0x00 }

export const HEAT_PRESETS: CommandPreset[] = [
    { key: 'heat_off', label: 'Heat Off', cmd: 0x7a, action: 0x00 },
    { key: 'heat_low', label: 'Heat Low', cmd: 0x7a, action: 0x01 },
    { key: 'heat_high', label: 'Heat High', cmd: 0x7a, action: 0x03 },
]

export const POSITION_G_PRESETS: CommandPreset[] = [
    { key: 'position_g_2', label: 'G2', cmd: 0x1c, action: 0x02 },
    { key: 'position_g_3', label: 'G3', cmd: 0x1c, action: 0x03 },
]

export const ROCK_PRESETS: CommandPreset[] = [
    { key: 'position_rocker_1', label: 'Rock 1', cmd: 0x20, action: 0x01 },
    { key: 'position_rocker_2', label: 'Rock 2', cmd: 0x20, action: 0x02 },
]

export const AUTO_PRESETS: CommandPreset[] = [
    { key: 'auto_1', label: 'Auto 1', cmd: 0x8c, action: 0x01 },
    { key: 'auto_2', label: 'Auto 2', cmd: 0x8c, action: 0x02 },
    { key: 'auto_3', label: 'Auto 3', cmd: 0x8c, action: 0x03 },
    { key: 'auto_4', label: 'Auto 4', cmd: 0x8c, action: 0x04 },
    { key: 'auto_5', label: 'Auto 5', cmd: 0x8c, action: 0x05 },
    { key: 'auto_6', label: 'Auto 6', cmd: 0x8c, action: 0x06 },
    { key: 'auto_7', label: 'Auto 7', cmd: 0x8c, action: 0x07 },
    { key: 'auto_8', label: 'Auto 8', cmd: 0x8c, action: 0x08 },
]

export const MANUAL_STYLE_PRESETS: CommandPreset[] = [
    { key: 'manual_knead', label: 'Knead', cmd: 0x43, action: 0x00 },
    { key: 'manual_tap', label: 'Tap', cmd: 0x44, action: 0x00 },
    { key: 'manual_knead_tap', label: 'Knead + Tap', cmd: 0x47, action: 0x00 },
    { key: 'manual_shiatsu', label: 'Shiatsu', cmd: 0x46, action: 0x00 },
    { key: 'manual_roll', label: 'Roll', cmd: 0x42, action: 0x00 },
]

export const MANUAL_SPEED_PRESETS: CommandPreset[] = [
    { key: 'manual_speed_1', label: 'Speed 1', cmd: 0x30, action: 0x01 },
    { key: 'manual_speed_2', label: 'Speed 2', cmd: 0x30, action: 0x02 },
    { key: 'manual_speed_3', label: 'Speed 3', cmd: 0x30, action: 0x03 },
    { key: 'manual_speed_4', label: 'Speed 4', cmd: 0x30, action: 0x04 },
    { key: 'manual_speed_5', label: 'Speed 5', cmd: 0x30, action: 0x05 },
    { key: 'manual_speed_6', label: 'Speed 6', cmd: 0x30, action: 0x06 },
]

export const MANUAL_REGION_PRESETS: CommandPreset[] = [
    { key: 'region_neck', label: 'Neck', cmd: 0x3d, action: 0x01 },
    { key: 'region_shoulder', label: 'Shoulder', cmd: 0x3d, action: 0x02 },
    { key: 'region_back', label: 'Back', cmd: 0x3d, action: 0x04 },
    { key: 'region_waist', label: 'Waist', cmd: 0x3d, action: 0x08 },
    { key: 'region_buttock', label: 'Buttock', cmd: 0x3d, action: 0x10 },
    { key: 'region_full', label: 'Full', cmd: 0x3d, action: 0x1f },
]

export const AIR_PRESETS: CommandPreset[] = [
    { key: 'air_1', label: 'Air 1', cmd: 0x52, action: 0x01 },
    { key: 'air_2', label: 'Air 2', cmd: 0x52, action: 0x02 },
    { key: 'air_3', label: 'Air 3', cmd: 0x52, action: 0x03 },
    { key: 'air_4', label: 'Air 4', cmd: 0x52, action: 0x04 },
    { key: 'air_5', label: 'Air 5', cmd: 0x52, action: 0x05 },
    { key: 'air_6', label: 'Air 6', cmd: 0x52, action: 0x06 },
]

export const MASSAGE_PRESETS: CommandPreset[] = [
    { key: 'massage_1', label: 'Push 1', cmd: 0x30, action: 0x01 },
    { key: 'massage_2', label: 'Push 2', cmd: 0x30, action: 0x02 },
    { key: 'massage_3', label: 'Push 3', cmd: 0x30, action: 0x03 },
    { key: 'massage_4', label: 'Push 4', cmd: 0x30, action: 0x04 },
    { key: 'massage_5', label: 'Push 5', cmd: 0x30, action: 0x05 },
    { key: 'massage_6', label: 'Push 6', cmd: 0x30, action: 0x06 },
]

export const TIMER_PRESETS: CommandPreset[] = [
    { key: 'timer_5', label: '5 min', cmd: 0x06, action: 0x05 },
    { key: 'timer_10', label: '10 min', cmd: 0x06, action: 0x0a },
    { key: 'timer_15', label: '15 min', cmd: 0x06, action: 0x0f },
    { key: 'timer_20', label: '20 min', cmd: 0x06, action: 0x14 },
]
