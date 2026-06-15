// VAPID public key is safe to ship to the browser — it's the public half of the keypair.
// The private key lives only in the server-side VAPID_PRIVATE_KEY secret.
export const VAPID_PUBLIC_KEY =
  "BKhqzimlxSXKmf1FK9n0jaINDW5QKsWBwQBD_LZYhpE2GPPdLIDPQAQz2oo4UNQP0riQtptO71Mu2zU5cvoyP38";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}
