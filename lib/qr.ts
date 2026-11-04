import "server-only";
import QRCode from "qrcode";

/** URL que va impresa en la etiqueta. No cambiar nunca la ruta /q/. */
export function publicUrl(token: string): string {
  const base = (process.env.APP_URL ?? "https://equipos.nybmedical.com").replace(/\/$/, "");
  return `${base}/q/${token}`;
}

/** QR negro puro sobre blanco, corrección M, zona quieta de 2 módulos. */
export async function qrSvg(token: string): Promise<string> {
  return QRCode.toString(publicUrl(token), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
