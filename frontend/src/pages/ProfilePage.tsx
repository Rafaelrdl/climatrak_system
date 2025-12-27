import { useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { ProfileDataForm } from '@/components/profile/forms/ProfileDataForm';
import { PreferencesForm } from '@/components/profile/forms/PreferencesForm';
import { SecurityForm } from '@/components/profile/forms/SecurityForm';
import { useUsers } from '@/data/usersStore';
import { toast } from 'sonner';
import { useMediaQuery } from '@/hooks/useMediaQuery';

type TabValue = 'dados' | 'preferencias' | 'seguranca';

const STORAGE_KEY = 'profile:lastTab';

const tabTitles: Record<TabValue, { title: string; subtitle: string }> = {
  dados: {
    title: 'Dados Pessoais',
    subtitle: 'Atualize suas informações pessoais e foto de perfil',
  },
  preferencias: {
    title: 'Preferências do Sistema',
    subtitle: 'Personalize a aparência e o comportamento do sistema',
  },
  seguranca: {
    title: 'Configurações de Segurança',
    subtitle: 'Gerencie sua senha e configurações de autenticação',
  },
};

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as TabValue) || 'dados';
  });

  const { getCurrentUser, updateCurrentUser } = useUsers();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = useCallback((tab: TabValue) => {
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  }, []);

  const handleSaveProfile = useCallback(async (data: any) => {
    try {
      updateCurrentUser(data);
      toast.success('Perfil atualizado com sucesso');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
      console.error('Error updating profile:', error);
    }
  }, [updateCurrentUser]);

  const handleSavePreferences = useCallback(async (preferences: any) => {
    try {
      updateCurrentUser({ preferences });
      toast.success('Preferências atualizadas com sucesso');
    } catch (error) {
      toast.error('Erro ao atualizar preferências');
      console.error('Error updating preferences:', error);
    }
  }, [updateCurrentUser]);

  const handleSaveSecurity = useCallback(async (security: any) => {
    try {
      updateCurrentUser({ security });
      toast.success('Configurações de segurança atualizadas');
    } catch (error) {
      toast.error('Erro ao atualizar segurança');
      console.error('Error updating security:', error);
    }
  }, [updateCurrentUser]);

  const handleAvatarClick = useCallback(() => {
    // Switch to profile data tab and focus on avatar upload
    setActiveTab('dados');
    localStorage.setItem(STORAGE_KEY, 'dados');
    // Trigger file input after a short delay to ensure tab change
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  }, []);

  const currentUser = getCurrentUser();
  const currentTabInfo = tabTitles[activeTab];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dados':
        return (
          <ProfileDataForm
            user={currentUser}
            onSave={handleSaveProfile}
            externalFileInputRef={fileInputRef}
          />
        );
      case 'preferencias':
        return (
          <PreferencesForm
            preferences={currentUser.preferences}
            onSave={handleSavePreferences}
          />
        );
      case 'seguranca':
        return (
          <SecurityForm
            security={currentUser.security}
            onSave={handleSaveSecurity}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Meu Perfil"
        subtitle="Gerencie suas informações pessoais, preferências e configurações de segurança"
      />

      {/* Profile Header Card */}
      <ProfileHeader 
        user={currentUser} 
        onAvatarClick={handleAvatarClick}
      />

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation (Desktop) / Tabs (Mobile) */}
        <aside className={isDesktop ? "w-72 shrink-0" : "w-full"}>
          <div className="bg-card rounded-xl border shadow-sm p-4 sticky top-4">
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              variant={isDesktop ? 'vertical' : 'horizontal'}
            />
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <div className="bg-card rounded-xl border shadow-sm">
            {/* Content Header */}
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">{currentTabInfo.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {currentTabInfo.subtitle}
              </p>
            </div>
            
            {/* Content Body */}
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}