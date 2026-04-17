import crypto from "crypto";

const getKey = (): Buffer => {
  const secret = process.env.SESSION_SECRET || "fallback-secret-key-change-me";
  return crypto.createHash("sha256").update(secret).digest();
};

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(encryptedText: string): string {
  try {
    const [ivHex, dataHex] = encryptedText.split(":");
    if (!ivHex || !dataHex) return encryptedText;
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(dataHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
