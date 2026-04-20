const STATIC_PREAMBLE = new Uint8Array([0x7e, 0x00, 0x01, 0x32, 0x00, 0x00, 0x03, 0xff])
const FRAME_DELIMITER = 0x7e
const ESCAPE_PREFIX = 0x5e
const ESCAPED_7E = 0x7d
const ESCAPED_5E = 0x5d

const toU8 = (value: number): number => value & 0xff

export const bytesToHex = (data: Uint8Array): string =>
  Array.from(data)
    .map((value) => value.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')

const buildPayload = (cmd: number, action: number, header = 0x10): Uint8Array => {
  const payload = new Uint8Array(10)
  payload[0] = 0x08
  payload[1] = toU8(header)
  payload[4] = toU8(cmd)
  payload[7] = toU8(action)
  return payload
}

const buildRawFrame = (cmd: number, action: number, header = 0x10): Uint8Array => {
  const frame = new Uint8Array(18)
  frame.set(STATIC_PREAMBLE, 0)
  frame.set(buildPayload(cmd, action, header), 8)

  let checksum = 0
  for (let index = 1; index < 18; index += 1) {
    checksum = toU8(checksum + frame[index])
  }
  frame[16] = checksum
  frame[0] = 0x00

  return frame
}

const escapeBytes = (data: Uint8Array): Uint8Array => {
  const output: number[] = []
  for (const value of data) {
    if (value === FRAME_DELIMITER) {
      output.push(ESCAPE_PREFIX, ESCAPED_7E)
    } else if (value === ESCAPE_PREFIX) {
      output.push(ESCAPE_PREFIX, ESCAPED_5E)
    } else {
      output.push(value)
    }
  }
  return new Uint8Array(output)
}

export const buildSendCmdPacket = (cmd: number, action: number, header = 0x10): Uint8Array => {
  const escaped = escapeBytes(buildRawFrame(cmd, action, header))
  if (escaped.length === 0) {
    throw new Error('Escaped packet is empty')
  }
  escaped[0] = FRAME_DELIMITER
  escaped[escaped.length - 1] = FRAME_DELIMITER
  return escaped
}
