import React from 'react';
import { UserRole } from '../types';
import {
  Home,
  Users,
  MessageSquare,
  Settings,
  ShieldCheck,
  BookOpen,
  MapPin,
  LucideIcon,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'admin'
  | 'channels'
  | 'private_chat'
  | 'history'
  | 'roadmap'
  | 'settings';

interface NavbarProps {
  activeTab: TabType;
  userRole?: UserRole;
  onSelectTab?: (tab: TabType) => void;
  onTabChange?: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  userRole = 'user',
  onSelectTab,
  onTabChange,
}) => {
  const handleSelect = (tab: TabType) => {
    onSelectTab?.(tab);
    onTabChange?.(tab);
  };

  const navItems: {
    id: TabType;
    label: string;
    IconComponent: LucideIcon;
  }[] =
    userRole === 'moderator'
      ? [
          { id: 'dashboard', label: 'الرئيسية', IconComponent: Home },
          { id: 'channels', label: 'القنوات', IconComponent: Users },
          { id: 'private_chat', label: 'خاص Sami', IconComponent: MessageSquare },
          { id: 'settings', label: 'الإعدادات', IconComponent: Settings },
        ]
      : userRole === 'owner'
      ? [
          { id: 'dashboard', label: 'الرئيسية', IconComponent: Home },
          { id: 'admin', label: 'الإدارة', IconComponent: ShieldCheck },
          { id: 'channels', label: 'القنوات', IconComponent: Users },
          { id: 'history', label: 'سجل الصفقات', IconComponent: BookOpen },
          { id: 'roadmap', label: 'المحطات', IconComponent: MapPin },
          { id: 'settings', label: 'الإعدادات', IconComponent: Settings },
        ]
      : [
          { id: 'dashboard', label: 'الرئيسية', IconComponent: Home },
          { id: 'channels', label: 'القنوات', IconComponent: Users },
          { id: 'history', label: 'سجل الصفقات', IconComponent: BookOpen },
          { id: 'roadmap', label: 'المحطات', IconComponent: MapPin },
          { id: 'settings', label: 'الإعدادات', IconComponent: Settings },
        ];

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#050811] via-[#080d1a]/98 to-[#0b1222]/95 backdrop-blur-xl border-t border-amber-500/20 px-1.5 pt-2 pb-2.5 select-none shadow-[0_-10px_30px_rgba(0,0,0,0.75)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            activeTab === item.id ||
            (item.id === 'channels' && activeTab === 'private_chat' && userRole !== 'moderator');
          const Icon = item.IconComponent;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-90 min-w-[54px] group ${
                isActive
                  ? 'text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Ambient Golden Glow behind active icon */}
              {isActive && (
                <div className="absolute -top-1 w-10 h-10 bg-amber-400/15 rounded-full blur-md pointer-events-none" />
              )}

              <div
                className={`transition-transform duration-200 ${
                  isActive
                    ? 'scale-110 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.65)]'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span
                className={`text-[10.5px] mt-1 tracking-tight transition-colors duration-200 whitespace-nowrap ${
                  isActive
                    ? 'font-black text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                    : 'font-semibold text-slate-400'
                }`}
              >
                {item.label}
              </span>

              {/* Glowing Golden Indicator Line Below Selected Item */}
              <div
                className={`mt-1.5 h-[3px] rounded-full transition-all duration-300 ${
                  isActive
                    ? 'w-8 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.9)] opacity-100'
                    : 'w-0 bg-transparent opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

