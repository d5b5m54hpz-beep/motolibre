import { MercadoPagoConfig, Preference, PreApproval, Payment, PaymentRefund } from "mercadopago";

/**
 * Lazy singleton — el cliente se crea la primera vez que se usa,
 * no al importar el módulo. Esto evita que el build falle si
 * MP_ACCESS_TOKEN no está configurado en el entorno de build.
 */
let _client: MercadoPagoConfig | null = null;

function getClient(): MercadoPagoConfig {
  if (!_client) {
    if (!process.env.MP_ACCESS_TOKEN) {
      throw new Error("MP_ACCESS_TOKEN no configurado");
    }
    _client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
      options: { timeout: 10000 },
    });
  }
  return _client;
}

export const mpPreference = {
  create: (...args: Parameters<Preference["create"]>) =>
    new Preference(getClient()).create(...args),
};

export const mpPreApproval = {
  create: (...args: Parameters<PreApproval["create"]>) =>
    new PreApproval(getClient()).create(...args),
  update: (...args: Parameters<PreApproval["update"]>) =>
    new PreApproval(getClient()).update(...args),
  get: (...args: Parameters<PreApproval["get"]>) =>
    new PreApproval(getClient()).get(...args),
};

export const mpPayment = {
  get: (...args: Parameters<Payment["get"]>) =>
    new Payment(getClient()).get(...args),
};

export const mpPaymentRefund = {
  create: (...args: Parameters<PaymentRefund["create"]>) =>
    new PaymentRefund(getClient()).create(...args),
};
