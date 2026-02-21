import { MercadoPagoConfig, Preference, PreApproval, Payment, PaymentRefund } from "mercadopago";

if (!process.env.MP_ACCESS_TOKEN) {
  throw new Error("MP_ACCESS_TOKEN no configurado");
}

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 10000 },
});

export const mpPreference = new Preference(mpClient);
export const mpPreApproval = new PreApproval(mpClient);
export const mpPayment = new Payment(mpClient);
export const mpPaymentRefund = new PaymentRefund(mpClient);
export { mpClient };
