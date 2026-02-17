// Omits O, 0, I, 1 to avoid visual confusion
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateShareCode(length = 7): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}

export async function generateUniqueShareCode(
  checkExists: (code: string) => Promise<boolean>,
  maxAttempts = 5
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateShareCode()
    if (!(await checkExists(code))) return code
  }
  return generateShareCode(8)
}
