export interface Part {
  id: number;
  name: string;
  article: string;
  brand: string;
  uom: string;
  type: string;
  quantity: number;
}

export interface OrderInfo {
  deadline: string;
  region: string;
  city: string;
  email: string;
  clientName: string;
  clientPhone: string;
  
  // Добавлены поля автомобиля
  carBrand: string;
  carModel: string;
  carYear: string;
  vin: string;
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