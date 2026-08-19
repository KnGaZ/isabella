export type MovementType = "INGRESO" | "EGRESO";
export type CurrencyCode = "MXN" | "USD";
export type TenderType = "EFECTIVO" | "TARJETA";

export type Caja = {
  id: string;
  code: string;
  name: string;
  emoji: string | null;
};

export type Area = {
  id: string;
  code: string;
  name: string;
};

export type UserProfile = {
  id: string;
  full_name: string;
};

export type CashMovementRow = {
  id: string;
  folio: number;
  date: string;
  type: MovementType;
  caja_id: string;
  area_id: string;
  concept: string | null;
  amount: number;
  currency: CurrencyCode;
  tender: TenderType;
  exchange_rate: number | null;
  amount_mxn: number;
  created_at: string;
};
