import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => (
  <button 
    onClick={toggleTheme} 
    className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
    title={theme === 'dark' ? "Auf hellen Modus wechseln" : "Auf dunklen Modus wechseln"}
  >
    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
  </button>
);
