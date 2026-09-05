'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RainbowKitButton } from './RainbowKitButton';
import {
  Home,
  TrendingUp,
  Trophy,
  User,
  PlusCircle,
  BarChart3,
  Zap,
  Brain,
  Copy,
  Award,
  Sparkles,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  highlight?: boolean;
};

export function Navigation() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/markets', label: 'Markets', icon: TrendingUp },
    { href: '/create/new', label: 'Create Prediction', icon: PlusCircle, highlight: true },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/reputation', label: 'Profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl hidden lg:inline-block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              PredictSOMNIA
            </span>
          </Link>

          {/* Main Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-1 flex-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              const isHighlight = !!item.highlight;
              return (
                <Link 
                  key={item.href} 
                  href={item.href as any}
                  prefetch={true}
                  className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors ${
                    isHighlight
                      ? 'px-2.5 py-1.5 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-sm'
                      : 'px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground'
                  } ${
                    isActive && !isHighlight
                      ? 'bg-primary text-primary-foreground' 
                      : ''
                  }`}
                >
                  <Icon className={isHighlight ? "h-3.5 w-3.5" : "h-4 w-4"} />
                  {item.label}
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-500 text-black rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Feature Badges - Desktop Only */}
          <div className="hidden xl:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-500/20">
              <Zap className="h-3 w-3 text-blue-600" />
              <span className="font-medium text-blue-600">x402 Gasless</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full border border-purple-500/20">
              <Brain className="h-3 w-3 text-purple-600" />
              <span className="font-medium text-purple-600">AI Oracle</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full border border-green-500/20">
              <Copy className="h-3 w-3 text-green-600" />
              <span className="font-medium text-green-600">Copy Trade</span>
            </div>
          </div>

          {/* Wallet Connect */}
          <RainbowKitButton />
        </div>

        {/* Secondary Feature Bar - Desktop */}
        <div className="hidden md:flex items-center justify-center gap-4 pb-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-yellow-500" />
            <span>Revolutionary Gasless Betting</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Brain className="h-3 w-3 text-purple-500" />
            <span>AI-Powered Resolution</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Award className="h-3 w-3 text-blue-500" />
            <span>On-Chain Reputation</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Copy className="h-3 w-3 text-green-500" />
            <span>Copy Top Traders</span>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden pb-3">
          {/* Primary Nav */}
          <nav className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              const isHighlight = !!item.highlight;
              return (
                <Link 
                  key={item.href} 
                  href={item.href as any}
                  prefetch={true}
                  className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isHighlight
                      ? 'px-2.5 py-1.5 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                      : 'px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground'
                  } ${
                    isActive && !isHighlight
                      ? 'bg-primary text-primary-foreground' 
                      : ''
                  }`}
                >
                  <Icon className={isHighlight ? "h-3.5 w-3.5" : "h-4 w-4"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          
          {/* Feature Pills - Mobile */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 whitespace-nowrap shrink-0">
              <Zap className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Gasless</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-full border border-purple-500/20 whitespace-nowrap shrink-0">
              <Brain className="h-3 w-3 text-purple-600" />
              <span className="text-xs font-medium text-purple-600">AI Oracle</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20 whitespace-nowrap shrink-0">
              <Copy className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-green-600">Copy Trade</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/20 whitespace-nowrap shrink-0">
              <Award className="h-3 w-3 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-600">Reputation</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
