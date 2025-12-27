/**
 * Exemplo de uso do ResponsiveTopNav
 * 
 * Este arquivo demonstra como integrar o componente ResponsiveTopNav
 * em uma aplicação React existente.
 */

import React from 'react';
import ResponsiveTopNav from '@/components/layout/ResponsiveTopNav';
import { 
  Home, 
  Package, 
  ClipboardList, 
  MessageSquare, 
  Calendar, 
  BarChart3,
  Warehouse,
  BookOpen,
  FileText,
  HelpCircle
} from 'lucide-react';

/**
 * Exemplo 1: Navegação básica
 */
export function BasicNavigationExample() {
  const items = [
    { id: 'home', label: 'Início', icon: <Home />, to: '/' },
    { id: 'products', label: 'Produtos', icon: <Package />, to: '/products' },
    { id: 'settings', label: 'Configurações', icon: <ClipboardList />, to: '/settings' },
  ];

  return (
    <div className="border-b">
      <div className="container mx-auto px-4 py-2">
        <ResponsiveTopNav items={items} />
      </div>
    </div>
  );
}

/**
 * Exemplo 2: Navegação completa (TrakNor CMMS)
 */
export function FullNavigationExample() {
  const items = [
    { id: 'overview', label: 'Visão Geral', icon: <Home />, to: '/' },
    { id: 'assets', label: 'Ativos', icon: <Package />, to: '/ativos' },
    { id: 'work-orders', label: 'Ordens de Serviço', icon: <ClipboardList />, to: '/work-orders' },
    { id: 'requests', label: 'Solicitações', icon: <MessageSquare />, to: '/requests' },
    { id: 'plans', label: 'Planos', icon: <Calendar />, to: '/plans' },
    { id: 'metrics', label: 'Métricas', icon: <BarChart3 />, to: '/metrics' },
    { id: 'inventory', label: 'Estoque', icon: <Warehouse />, to: '/inventory' },
    { id: 'procedures', label: 'Procedimentos', icon: <BookOpen />, to: '/procedures' },
    { id: 'reports', label: 'Relatórios', icon: <FileText />, to: '/reports' },
    { id: 'help', label: 'Ajuda', icon: <HelpCircle />, to: '/help' },
  ];

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold">TrakNor CMMS</h1>
          </div>

          {/* Navegação responsiva */}
          <ResponsiveTopNav items={items} />

          {/* Avatar/Menu do usuário */}
          <div className="flex-shrink-0 ml-4">
            <button className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
              U
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Exemplo 3: Sem ícones (apenas texto)
 */
export function TextOnlyNavigationExample() {
  const items = [
    { id: 'about', label: 'Sobre', to: '/about' },
    { id: 'services', label: 'Serviços', to: '/services' },
    { id: 'portfolio', label: 'Portfólio', to: '/portfolio' },
    { id: 'team', label: 'Equipe', to: '/team' },
    { id: 'contact', label: 'Contato', to: '/contact' },
  ];

  return <ResponsiveTopNav items={items} />;
}

/**
 * Exemplo 4: Integração com contexto de autenticação
 */
export function AuthAwareNavigationExample() {
  // Simula contexto de autenticação
  const userRole = 'admin'; // ou 'technician', 'requester'

  // Itens diferentes baseados no perfil
  const getItemsByRole = (role: string) => {
    const baseItems = [
      { id: 'home', label: 'Início', icon: <Home />, to: '/' },
      { id: 'work-orders', label: 'OS', icon: <ClipboardList />, to: '/work-orders' },
    ];

    if (role === 'admin') {
      return [
        ...baseItems,
        { id: 'users', label: 'Usuários', icon: <Package />, to: '/users' },
        { id: 'settings', label: 'Configurações', icon: <MessageSquare />, to: '/settings' },
      ];
    }

    return baseItems;
  };

  return <ResponsiveTopNav items={getItemsByRole(userRole)} />;
}

/**
 * Como usar em Layout.tsx
 */
export function LayoutIntegrationExample() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header com navegação */}
      <FullNavigationExample />

      {/* Conteúdo principal */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Seu conteúdo aqui */}
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2024 TrakNor CMMS
        </div>
      </footer>
    </div>
  );
}
