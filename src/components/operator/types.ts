export interface Part {
  id: number;
  name: string;
  article: string;
  brand: string;
  uom: string;
  quantity: number;
  photoUrl?: string; 
  itemFiles?: { name: string; url: string; size?: number; type?: string }[];
  isNewBrand?: boolean; // Флаг нового бренда
}

export interface OrderInfo {
  deadline: string;
  region: string;
  city: string;
  email: string;
  clientEmail?: string; // Почта клиента
  emailSubject: string; 
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