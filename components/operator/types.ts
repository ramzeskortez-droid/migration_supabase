export interface Part {
  id: number;
  name: string;
  article: string;
  brand: string;
  uom: string;
  quantity: number;
}

export interface OrderInfo {
  deadline: string;
  region: string;
  city: string;
  email: string;
  emailSubject: string; // Новое поле
  clientName: string;
  clientPhone: string;
}

export interface LogHistory {
  timestamp: number;
  tokens: number;
}

export interface DisplayStats {
  rpm: number;
  tpm: number;
  totalRequests: number;
  resetIn: number;
  logs: string[];
}