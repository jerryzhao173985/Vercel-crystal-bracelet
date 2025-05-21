// utils/builtin.js
/**
 * Built-in helper functions for template processing
 * These functions are always available in the template context
 */

// Date and time utilities
const dateUtils = {
  // Format date as weekday
  dayOfWeek: (dob) => new Date(dob).toLocaleDateString('zh-CN', { weekday: 'long' }),
  
  // Format date in various ways
  formatDate: (date, format = 'YYYY-MM-DD') => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes);
  },
  
  // Calculate age from birthdate
  calculateAge: (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  },
  
  // Check if a date is in the future
  isFutureDate: (date) => new Date(date) > new Date()
};

// String utilities
const stringUtils = {
  // Capitalize first letter of each word
  capitalize: (str) => {
    if (!str) return '';
    return str.replace(/\b\w/g, char => char.toUpperCase());
  },
  
  // Format a number with commas
  formatNumber: (num) => {
    if (num === undefined || num === null) return '';
    return String(num).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
  },
  
  // Truncate a string with ellipsis
  truncate: (str, maxLength = 50) => {
    if (!str || str.length <= maxLength) return str || '';
    return str.slice(0, maxLength) + '...';
  }
};

// Color utilities for element-based operations
const colorUtils = {
  // Get complementary color
  getComplementary: (hexColor) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#000000';
    
    // Remove # and handle both 3 and 6 character formats
    let hex = hexColor.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    // Convert to RGB, invert, convert back to hex
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    const rComplement = 255 - r;
    const gComplement = 255 - g;
    const bComplement = 255 - b;
    
    return `#${rComplement.toString(16).padStart(2, '0')}${gComplement.toString(16).padStart(2, '0')}${bComplement.toString(16).padStart(2, '0')}`;
  },
  
  // Lighten a color by percentage
  lightenColor: (hexColor, percent = 30) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#FFFFFF';
    
    // Remove # and handle both 3 and 6 character formats
    let hex = hexColor.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    // Convert to RGB, lighten, convert back to hex
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    const factor = 1 + (percent / 100);
    const rLightened = Math.min(255, Math.round(r * factor));
    const gLightened = Math.min(255, Math.round(g * factor));
    const bLightened = Math.min(255, Math.round(b * factor));
    
    return `#${rLightened.toString(16).padStart(2, '0')}${gLightened.toString(16).padStart(2, '0')}${bLightened.toString(16).padStart(2, '0')}`;
  },
  
  // Check if a color is light or dark
  isLightColor: (hexColor) => {
    if (!hexColor || !hexColor.startsWith('#')) return true;
    
    // Remove # and handle both 3 and 6 character formats
    let hex = hexColor.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    // Calculate relative luminance
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.5;
  }
};

// Element mapping utilities
const elementUtils = {
  // Map zodiac signs to elements
  zodiacToElement: (sign) => {
    if (!sign) return null;
    const normalized = sign.toLowerCase().trim();
    
    const fireElements = ['aries', 'leo', 'sagittarius'];
    const earthElements = ['taurus', 'virgo', 'capricorn'];
    const airElements = ['gemini', 'libra', 'aquarius'];
    const waterElements = ['cancer', 'scorpio', 'pisces'];
    
    if (fireElements.includes(normalized)) return 'fire';
    if (earthElements.includes(normalized)) return 'earth';
    if (airElements.includes(normalized)) return 'air';
    if (waterElements.includes(normalized)) return 'water';
    
    return null;
  },
  
  // Get default element colors
  getElementColor: (element) => {
    if (!element) return '#CCCCCC';
    
    const colors = {
      metal: '#FFD700',   // Gold
      wood: '#228B22',    // Forest Green
      water: '#1E90FF',   // Dodger Blue
      fire: '#FF4500',    // Orange Red
      earth: '#DEB887'    // Burlywood
    };
    
    return colors[element.toLowerCase()] || '#CCCCCC';
  },
  
  // Get opposite element
  getOppositeElement: (element) => {
    if (!element) return null;
    
    const opposites = {
      metal: 'fire',
      fire: 'metal',
      water: 'earth',
      earth: 'water',
      wood: 'wood'  // Wood is neutral/balanced with itself in some systems
    };
    
    return opposites[element.toLowerCase()] || null;
  }
};

// Export all utility groups
module.exports = {
  ...dateUtils,
  ...stringUtils,
  ...colorUtils,
  ...elementUtils,
  
  // Add data validation utilities
  isValidDate: (date) => {
    const d = new Date(date);
    return !isNaN(d.getTime());
  },
  
  isValidTime: (time) => {
    if (!time) return false;
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  },
  
  // Simplified fetch wrapper for templates
  async simpleFetch(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error.message);
      return { error: error.message };
    }
  }
};