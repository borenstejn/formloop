const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ALPHABET_LEN = ALPHABET.length; // 62
// Largest multiple of 62 that fits in a byte: 62 * 4 = 248
const MAX_VALID_BYTE = 248;

export function generateFormId(length = 10): string {
  let id = "";
  while (id.length < length) {
    // Over-sample to reduce iterations from rejection
    const arr = new Uint8Array((length - id.length) * 2);
    crypto.getRandomValues(arr);
    for (let i = 0; i < arr.length && id.length < length; i++) {
      if (arr[i] < MAX_VALID_BYTE) {
        id += ALPHABET[arr[i] % ALPHABET_LEN];
      }
    }
  }
  return id;
}
