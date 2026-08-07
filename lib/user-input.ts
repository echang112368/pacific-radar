export const MAX_SIMULATOR_COMMAND_LENGTH = 160;

const CONTROL_AND_DIRECTIONAL_CHARACTERS =
  /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;

export function sanitizeSimulatorCommand(value: string) {
  return value
    .normalize("NFKC")
    .replace(CONTROL_AND_DIRECTIONAL_CHARACTERS, "")
    .slice(0, MAX_SIMULATOR_COMMAND_LENGTH);
}
