export enum UserRole {
  ADMIN = 'ADMIN',
  REPRESENTATIVE = 'REPRESENTATIVE',
  SUPERVISOR = 'SUPERVISOR',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string; // Only used for mock auth check
}

export interface Product {
  id: string;
  code: string;
  description: string;
  reference: string;
  colors: string[]; // JSON string array
  imageUrl: string;
  category: string;
  subcategory: string;
  line: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export enum OrderStatus {
  NEW = 'Novo',
  IN_PROGRESS = 'Em Atendimento',
  WAITING_STOCK = 'Aguardando Estoque',
  CLOSED = 'Finalizado',
  CANCELLED = 'Cancelado'
}

export interface CRMInteraction {
  id: string;
  date: string;
  type: 'note' | 'call' | 'email' | 'meeting';
  content: string;
  authorName: string;
}

export interface Order {
  id: string;
  customerName?: string; // Client info is optional/anonymous
  customerContact?: string;
  representativeId: string;
  items: CartItem[];
  status: OrderStatus;
  createdAt: string;
  notes: string; // Initial notes from client
  interactions: CRMInteraction[]; // CRM history
}

// Stats interface for Admin/Rep dashboard
export interface DashboardStats {
  totalOrders: number;
  newOrders: number;
  completedOrders: number;
}