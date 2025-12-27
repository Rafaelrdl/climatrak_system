import React, { useState, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

type TabValue = 'table' | 'cards' | 'analysis' | 'history';

interface Tab {
  value: TabValue;
  label: string;
  content: React.ReactNode;
}

interface InventoryTabsProps {
  tabs: Tab[];
  defaultValue?: TabValue;
  className?: string;
}

const STORAGE_KEY = 'inventory:lastTab';

export function InventoryTabs({ tabs, defaultValue = 'table', className = '' }: InventoryTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored as TabValue) || defaultValue;
    } catch {
      return defaultValue;
    }
  });
  
  const [focusedIndex, setFocusedIndex] = useState<number>(() => 
    tabs.findIndex(tab => tab.value === activeTab)
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, activeTab);
    } catch (error) {
      console.warn('Failed to save tab preference:', error);
    }
  }, [activeTab]);

  const handleTabClick = (value: TabValue, index: number) => {
    setActiveTab(value);
    setFocusedIndex(index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowLeft': {
        event.preventDefault();
        const prevIndex = index > 0 ? index - 1 : tabs.length - 1;
        setFocusedIndex(prevIndex);
        // Focus the previous tab button
        const prevButton = event.currentTarget.parentElement?.children[prevIndex] as HTMLButtonElement;
        prevButton?.focus();
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        const nextIndex = index < tabs.length - 1 ? index + 1 : 0;
        setFocusedIndex(nextIndex);
        // Focus the next tab button
        const nextButton = event.currentTarget.parentElement?.children[nextIndex] as HTMLButtonElement;
        nextButton?.focus();
        break;
      }
      case 'Home': {
        event.preventDefault();
        setFocusedIndex(0);
        const firstButton = event.currentTarget.parentElement?.children[0] as HTMLButtonElement;
        firstButton?.focus();
        break;
      }
      case 'End': {
        event.preventDefault();
        const lastIndex = tabs.length - 1;
        setFocusedIndex(lastIndex);
        const lastButton = event.currentTarget.parentElement?.children[lastIndex] as HTMLButtonElement;
        lastButton?.focus();
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        setActiveTab(tabs[index].value);
        setFocusedIndex(index);
        break;
      }
    }
  };

  const activeTabContent = tabs.find(tab => tab.value === activeTab)?.content;

  return (
    <div className={className}>
      {/* Tab List */}
      <div 
        className="flex border-b border-border"
        role="tablist"
        aria-label="Visualizações de inventário"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            aria-controls={`panel-${tab.value}`}
            id={`tab-${tab.value}`}
            tabIndex={activeTab === tab.value ? 0 : -1}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors focus-ring',
              'hover:text-foreground hover:border-muted-foreground/30',
              activeTab === tab.value
                ? 'text-primary border-primary bg-primary/5'
                : 'text-muted-foreground border-transparent'
            )}
            onClick={() => handleTabClick(tab.value, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        {tabs.map((tab) => (
          <div
            key={tab.value}
            role="tabpanel"
            id={`panel-${tab.value}`}
            aria-labelledby={`tab-${tab.value}`}
            hidden={activeTab !== tab.value}
            tabIndex={0}
          >
            {activeTab === tab.value && tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}