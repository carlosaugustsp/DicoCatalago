
import { Product, User, UserRole, Order, OrderStatus } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    email: 'admin@dicompel.com.br',
    name: 'Administrador Dicompel',
    role: UserRole.ADMIN,
    password: '123'
  },
  {
    id: 'u2',
    email: 'rep1@dicompel.com.br',
    name: 'João Representante',
    role: UserRole.REPRESENTATIVE,
    password: '123'
  },
  {
    id: 'u3',
    email: 'rep2@dicompel.com.br',
    name: 'Maria Vendas',
    role: UserRole.REPRESENTATIVE,
    password: '123'
  },
  {
    id: 'u4',
    email: 'supervisor@dicompel.com.br',
    name: 'Carlos Supervisor',
    role: UserRole.SUPERVISOR,
    password: '123'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    code: 'TOM-001',
    description: 'Tomada 10A 2P+T Branca',
    reference: 'REF-1001',
    colors: ['Branco', 'Preto', 'Cinza'],
    category: 'Tomadas',
    subcategory: 'Residencial',
    line: 'Classic',
    imageUrl: 'https://picsum.photos/300/300?random=1'
  },
  {
    id: 'p2',
    code: 'INT-002',
    description: 'Interruptor Simples',
    reference: 'REF-2001',
    colors: ['Branco', 'Marfim'],
    category: 'Interruptores',
    subcategory: 'Simples',
    line: 'Premium',
    imageUrl: 'https://picsum.photos/300/300?random=2'
  },
  // PRODUTOS LINHA NOVARA (PLACAS)
  {
    id: 'n1',
    code: 'NOV-PL-42-G',
    description: 'Placa 4x2 Novara Gold',
    reference: 'NOV-100',
    colors: ['Ouro'],
    category: 'Placas',
    subcategory: '4x2',
    line: 'Novara',
    imageUrl: 'https://picsum.photos/300/300?random=10'
  },
  {
    id: 'n2',
    code: 'NOV-PL-42-B',
    description: 'Placa 4x2 Novara Black Matt',
    reference: 'NOV-101',
    colors: ['Preto'],
    category: 'Placas',
    subcategory: '4x2',
    line: 'Novara',
    imageUrl: 'https://picsum.photos/300/300?random=11'
  },
  {
    id: 'n3',
    code: 'NOV-PL-44-W',
    description: 'Placa 4x4 Novara White Glass',
    reference: 'NOV-200',
    colors: ['Branco'],
    category: 'Placas',
    subcategory: '4x4',
    line: 'Novara',
    imageUrl: 'https://picsum.photos/300/300?random=12'
  },
  // PRODUTOS LINHA NOVARA (MÓDULOS)
  {
    id: 'm1',
    code: 'NOV-MOD-T10',
    description: 'Módulo Tomada 10A Novara',
    reference: 'MOD-01',
    colors: ['Branco', 'Preto'],
    category: 'Módulos',
    subcategory: 'Tomadas',
    line: 'Novara',
    imageUrl: 'https://picsum.photos/300/300?random=20'
  },
  {
    id: 'm2',
    code: 'NOV-MOD-INT',
    description: 'Módulo Interruptor Simples Novara',
    reference: 'MOD-02',
    colors: ['Branco', 'Preto'],
    category: 'Módulos',
    subcategory: 'Interruptores',
    line: 'Novara',
    imageUrl: 'https://picsum.photos/300/300?random=21'
  },
  {
    id: 'm3',
    code: 'NOV-MOD-USB',
    description: 'Módulo Carregador USB Novara',
    reference: 'MOD-03',
    colors: ['Preto'],
    category: 'Módulos',
    subcategory: 'Conectividade',
    line: 'Novara',
    imageUrl: 'https://picsum.photos/300/300?random=22'
  },
  {
    id: 'p3',
    code: 'AUT-003',
    description: 'Botão de Automação Wifi',
    reference: 'REF-3001',
    colors: ['Preto', 'Prata'],
    category: 'Automação',
    subcategory: 'Smart Home',
    line: 'Tech',
    imageUrl: 'https://picsum.photos/300/300?random=3'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'o1',
    representativeId: 'u2',
    items: [
      { ...INITIAL_PRODUCTS[0], quantity: 50 },
      { ...INITIAL_PRODUCTS[1], quantity: 20 }
    ],
    status: OrderStatus.NEW,
    createdAt: new Date().toISOString(),
    customerName: 'Loja Elétrica Central',
    customerContact: '11 99999-9999',
    notes: 'Entregar na parte da manhã',
    interactions: [
      {
        id: 'i1',
        date: new Date().toISOString(),
        type: 'note',
        content: 'Pedido recebido pelo sistema.',
        authorName: 'Sistema'
      }
    ]
  }
];
