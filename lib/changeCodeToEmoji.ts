export const changeCodeToEmoji = (code: string) => {
  if (!code) return String.fromCodePoint(0x1f9e0);

  const isValidHex = /^[0-9a-fA-F]+$/.test(code);
  if (isValidHex) {
    try {
      return String.fromCodePoint(parseInt(code, 16));
    } catch {
      return String.fromCodePoint(0x1f9e0);
    }
  }
  
  return code;
};
