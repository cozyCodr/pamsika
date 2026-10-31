import "server-only";
import { EventEmitter } from "node:events";

export type PaymentEvent = {
  kind: "payment";
  paymentId: string;
  stallId: string | null;
  itemName: string | null;
  amountUsd: number | null;
  amountZmw: number | null;
  status: string;
  source: string;
  at: string;
};

const g = globalThis as unknown as { __pamsikaBus?: EventEmitter };
export const bus: EventEmitter = (g.__pamsikaBus ??= new EventEmitter().setMaxListeners(200));

export function publishPayment(evt: PaymentEvent) {
  bus.emit("payment", evt);
}
