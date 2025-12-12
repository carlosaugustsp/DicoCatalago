import React, { useState } from 'react';
import { authService } from '../services/api';
import { User } from '../types';
import { Button } from '../components/Button';
import { Package, Lock, Mail } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  navigate: (page: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, navigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await authService.login(email, password);
      if (user) {
        onLogin(user);
        navigate('dashboard');
      } else {
        setError('Credenciais inválidas. Tente admin@dicompel.com.br / Sigilo!@#2025');
      }
    } catch (err) {
      setError('Erro ao conectar.');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "block w-full pl-10 bg-gray-700 border border-gray-600 rounded-md py-2 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 focus:outline-none";

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 border border-gray-200">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mb-4">
            <Package className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Acesso Restrito</h2>
          <p className="mt-2 text-sm text-gray-600">Representantes e Administradores</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded border border-red-200 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                className={inputClasses}
                placeholder="seunome@dicompel.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Senha</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                className={inputClasses}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <div className="text-center mt-4">
             <button type="button" onClick={() => navigate('catalog')} className="text-sm text-blue-600 hover:text-blue-500">
               Voltar para o Catálogo (Cliente)
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};