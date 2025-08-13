// Utility functions for consistent deal color handling across components

export const getDealColorHex = (coverColor: string | null): string => {
  // Convert Tailwind class to hex color for use in SVGs and inline styles
  const colorMap: { [key: string]: string } = {
    'bg-red-500': '#EF4444',
    'bg-green-500': '#10B981',
    'bg-blue-500': '#3B82F6',
    'bg-yellow-500': '#EAB308',
    'bg-purple-500': '#8B5CF6',
    'bg-pink-500': '#EC4899',
    'bg-indigo-500': '#6366F1',
    'bg-orange-500': '#F97316',
    'bg-teal-500': '#14B8A6',
    'bg-cyan-500': '#06B6D4',
    'bg-gray-500': '#6B7280',
    'bg-gradient-to-br from-blue-500 to-purple-600': '#3B82F6',
  };
  return colorMap[coverColor || 'bg-blue-500'] || '#3B82F6';
};

export const getDealColorClass = (coverColor: string | null): string => {
  // Return the Tailwind class for use in component styling
  return coverColor || 'bg-blue-500';
};