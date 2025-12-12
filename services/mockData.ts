import { Product, User, UserRole, Order, OrderStatus } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    email: 'admin@dicompel.com.br',
    name: 'Administrador Dicompel',
    role: UserRole.ADMIN,
    password: 'Sigilo!@#2025'
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
  },
  {
    id: 'p4',
    code: 'CHU-004',
    description: 'Chuveiro Eletrônico 7500W',
    reference: 'REF-4001',
    colors: ['Branco'],
    category: 'Chuveiros',
    subcategory: 'Eletrônico',
    line: 'Banho Max',
    imageUrl: 'https://picsum.photos/300/300?random=4'
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