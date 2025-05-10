import {
  Wine,
  Music,
  Shirt,
  ShoppingBag,
  Package,
  Sparkles,
  Gamepad2,
  Dumbbell,
  Home as HomeIcon,
  Cable as Cannabis,
  Laptop,
  Baby,
  X
} from 'lucide-react';
import React from 'react';

// Utility functions for handling brand categories
export const getCategoryColor = (category: string) => {
  const colors = {
    'Fashion & Apparel': {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      hover: 'hover:bg-purple-100'
    },
    'Alcoholic Beverages': {
      bg: 'bg-red-50',
      text: 'text-red-700',
      hover: 'hover:bg-red-100'
    },
    'Entertainment & Media': {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      hover: 'hover:bg-blue-100'
    },
    'Food & Soft Drinks': {
      bg: 'bg-green-50',
      text: 'text-green-700',
      hover: 'hover:bg-green-100'
    },
    'Beauty & Personal Care': {
      bg: 'bg-pink-50',
      text: 'text-pink-700',
      hover: 'hover:bg-pink-100'
    },
    'Beauty & Personal Care (Fragrance)': {
      bg: 'bg-pink-50',
      text: 'text-pink-700',
      hover: 'hover:bg-pink-100'
    },
    'Sports & Esports': {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      hover: 'hover:bg-indigo-100'
    },
    'Health & Fitness': {
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      hover: 'hover:bg-teal-100'
    },
    'Home & Lifestyle': {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      hover: 'hover:bg-amber-100'
    },
    'Cannabis & CBD': {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      hover: 'hover:bg-emerald-100'
    },
    'Tech & Electronics': {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      hover: 'hover:bg-sky-100'
    },
    'Tech & Software': {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      hover: 'hover:bg-sky-100'
    },
    'Toys, Games & Children\'s Products': {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      hover: 'hover:bg-rose-100'
    }
  };

  return colors[category as keyof typeof colors] || {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    hover: 'hover:bg-gray-100'
  };
};

export const getCategoryIcon = (category: string): React.ReactNode => {
  switch (category) {
    case 'Fashion & Apparel':
      return <Shirt className="w-6 h-6" />;
    case 'Alcoholic Beverages':
      return <Wine className="w-6 h-6" />;
    case 'Entertainment & Media':
      return <Music className="w-6 h-6" />;
    case 'Food & Soft Drinks':
      return <Package className="w-6 h-6" />;
    case 'Beauty & Personal Care':
    case 'Beauty & Personal Care (Fragrance)':
      return <Sparkles className="w-6 h-6" />;
    case 'Sports & Esports':
      return <Gamepad2 className="w-6 h-6" />;
    case 'Health & Fitness':
      return <Dumbbell className="w-6 h-6" />;
    case 'Home & Lifestyle':
      return <HomeIcon className="w-6 h-6" />;
    case 'Cannabis & CBD':
      return <Cannabis className="w-6 h-6" />;
    case 'Tech & Electronics':
    case 'Tech & Software':
      return <Laptop className="w-6 h-6" />;
    case 'Toys, Games & Children\'s Products':
      return <Baby className="w-6 h-6" />;
    default:
      return <ShoppingBag className="w-6 h-6" />;
  }
};