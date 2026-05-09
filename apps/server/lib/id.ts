const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateFormId(length = 10): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  let id = "";
  for (let i = 0; i < length; i++) id += ALPHABET[arr[i] % ALPHABET.length];
  return id;
}
