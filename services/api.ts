import { Product, User, Order, UserRole, OrderStatus, CartItem } from '../types';
import { supabase } from './supabaseClient';

// --- Helpers ---
// No longer needed for localStorage, but keeping structure clean

// --- Auth ---
export const authService = {
  login: async (email: string, password: string): Promise<User | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      console.error('Login error:', error);
      return null;
    }

    // Fetch profile data (role/name)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profile) {
      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: profile.name,
        role: profile.role as UserRole,
      };
      // Save session to localStorage for persistence across reloads (simple approach)
      localStorage.setItem('dicompel_user', JSON.stringify(user));
      return user;
    }
    
    return null;
  },
  
  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('dicompel_user');
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem('dicompel_user');
    return stored ? JSON.parse(stored) : null;
  }
};

// --- Products ---
export const productService = {
  getAll: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*');
    
    if (error) {
      console.error('Error loading products:', error);
      return [];
    }
    
    // Map database snake_case columns to camelCase if needed, 
    // but our SQL table uses names that match reasonably well or we map them here
    return data.map((p: any) => ({
      id: p.id,
      code: p.code,
      description: p.description,
      reference: p.reference,
      colors: p.colors || [],
      imageUrl: p.image_url,
      category: p.category,
      subcategory: p.subcategory,
      line: p.line
    }));
  },
  
  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const dbProduct = {
      code: product.code,
      description: product.description,
      reference: product.reference,
      colors: product.colors,
      image_url: product.imageUrl,
      category: product.category,
      subcategory: product.subcategory,
      line: product.line
    };

    const { data, error } = await supabase
      .from('products')
      .insert([dbProduct])
      .select()
      .single();

    if (error) throw error;

    return {
      ...product,
      id: data.id,
      imageUrl: data.image_url
    };
  },

  update: async (product: Product): Promise<void> => {
    const dbProduct = {
      code: product.code,
      description: product.description,
      reference: product.reference,
      colors: product.colors,
      image_url: product.imageUrl,
      category: product.category,
      subcategory: product.subcategory,
      line: product.line
    };

    await supabase
      .from('products')
      .update(dbProduct)
      .eq('id', product.id);
  },

  delete: async (id: string): Promise<void> => {
    await supabase.from('products').delete().eq('id', id);
  },

  importCSV: async (csvText: string): Promise<void> => {
    const lines = csvText.split('\n');
    const productsToInsert = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(',');
      if (cols.length >= 6) {
        productsToInsert.push({
          code: cols[0]?.trim() || '',
          description: cols[1]?.trim() || '',
          reference: cols[2]?.trim() || '',
          category: cols[3]?.trim() || '',
          subcategory: cols[4]?.trim() || '',
          line: cols[5]?.trim() || '',
          colors: cols[6] ? cols[6].split('|').map(c => c.trim()) : [],
          image_url: 'https://picsum.photos/300/300'
        });
      }
    }

    if (productsToInsert.length > 0) {
      const { error } = await supabase.from('products').insert(productsToInsert);
      if (error) console.error('Error importing CSV:', error);
    }
  }
};

// --- Orders ---
export const orderService = {
  getAll: async (): Promise<Order[]> => {
    // We need to fetch orders with their items (and product details) and interactions
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          products (
            *
          )
        ),
        interactions (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }

    // Transform Supabase structure to App structure
    return data.map((order: any) => ({
      id: order.id,
      createdAt: order.created_at,
      status: order.status as OrderStatus,
      customerName: order.customer_name,
      customerContact: order.customer_contact,
      notes: order.notes,
      representativeId: order.representative_id,
      // Map interactions
      interactions: order.interactions.map((i: any) => ({
        id: i.id,
        date: i.date,
        type: i.type,
        content: i.content,
        authorName: i.author_name
      })),
      // Map items
      items: order.order_items.map((item: any) => ({
        id: item.products.id,
        code: item.products.code,
        description: item.products.description,
        reference: item.products.reference,
        colors: item.products.colors || [],
        imageUrl: item.products.image_url,
        category: item.products.category,
        subcategory: item.products.subcategory,
        line: item.products.line,
        quantity: item.quantity
      }))
    }));
  },

  getByRep: async (repId: string): Promise<Order[]> => {
    // RLS handles visibility, but we can filter explicitly too
    const orders = await orderService.getAll();
    // Assuming RLS is set up, getAll returns only allowed orders, 
    // but let's double check representativeId for good measure if admin calls this
    return orders.filter(o => o.representativeId === repId);
  },

  create: async (order: Omit<Order, 'id' | 'createdAt' | 'status' | 'interactions'>): Promise<Order> => {
    // 1. Create Order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        representative_id: order.representativeId,
        customer_name: order.customerName,
        customer_contact: order.customerContact,
        notes: order.notes,
        status: OrderStatus.NEW
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Create Order Items
    const itemsData = order.items.map(item => ({
      order_id: orderData.id,
      product_id: item.id,
      quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsData);

    if (itemsError) throw itemsError;

    // 3. Create Initial Interaction
    await supabase.from('interactions').insert([{
      order_id: orderData.id,
      type: 'note',
      content: 'Pedido recebido via sistema.',
      author_name: 'Sistema'
    }]);

    // Return partial order (frontend usually reloads or navigates away)
    return { ...order, id: orderData.id } as Order;
  },

  update: async (order: Order): Promise<void> => {
    // Update status
    await supabase
      .from('orders')
      .update({ status: order.status })
      .eq('id', order.id);

    // Update Items is complex (delete/re-insert or diff). 
    // For simplicity in this edit: Delete all items for this order and re-insert
    
    // First check if items changed (optimization skipped for brevity)
    await supabase.from('order_items').delete().eq('order_id', order.id);
    
    const itemsData = order.items.map(item => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity
    }));
    
    if (itemsData.length > 0) {
      await supabase.from('order_items').insert(itemsData);
    }

    // Add new interactions if any (usually handled by separate addInteraction call, 
    // but if passed here, we should ensure they exist)
    if (order.interactions && order.interactions.length > 0) {
       // Ideally we only insert new ones. 
       // For now, let's rely on handleAddInteraction in Dashboard which calls a specific logic.
    }
  },

  delete: async (id: string): Promise<void> => {
    await supabase.from('orders').delete().eq('id', id);
  }
};

// --- Users (Admin only) ---
export const userService = {
  getAll: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) return [];
    
    return data.map((p: any) => ({
      id: p.id,
      email: p.email,
      name: p.name,
      role: p.role as UserRole
    }));
  },

  getReps: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'REPRESENTATIVE');
      
    if (error) return [];

    return data.map((p: any) => ({
      id: p.id,
      email: p.email,
      name: p.name,
      role: p.role as UserRole
    }));
  },
  
  create: async (user: Omit<User, 'id'> & { password?: string }): Promise<User> => {
     // 1. Create Auth User
     const { data: authData, error: authError } = await supabase.auth.signUp({
       email: user.email,
       password: user.password || '123456', // Default password
       options: {
         data: {
           name: user.name,
           role: user.role
         }
       }
     });

     if (authError) throw authError;
     if (!authData.user) throw new Error("No user created");

     // Trigger automatically handles profile creation (see SQL)
     // But we return the user object
     return {
       id: authData.user.id,
       email: user.email,
       name: user.name,
       role: user.role
     };
  },

  update: async (user: User & { password?: string }): Promise<void> => {
     // Update Profile
     await supabase
       .from('profiles')
       .update({ name: user.name, role: user.role })
       .eq('id', user.id);

     // Update Password if provided
     if (user.password) {
       // Admin updating another user's password requires service role usually, 
       // or the user updating themselves. 
       // For this MVP, let's assume this might fail without Edge Functions if done by Admin for others
       // so we just log a warning or use update user if logged in as that user.
       console.warn("Password update for others requires Admin Service Role API");
     }
  },

  delete: async (id: string): Promise<void> => {
    // Requires Supabase Admin API to delete from Auth, 
    // but deleting from 'profiles' might restrict access if app relies on profiles.
    // For complete deletion, do it in Supabase Dashboard or use Edge Function.
    await supabase.from('profiles').delete().eq('id', id);
  }
};