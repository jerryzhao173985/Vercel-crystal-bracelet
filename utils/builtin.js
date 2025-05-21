// utils/builtin.js
/**
 * Built-in helper functions for template processing
 * These functions are always available in the template context
 */

// Date and time utilities
const dateUtils = {
  // Format date as weekday
  dayOfWeek: (dob) => new Date(dob).toLocaleDateString('zh-CN', { weekday: 'long' }),
  
  // Format date in various ways using Intl.DateTimeFormat for better localization
  formatDate: (date, format = 'YYYY-MM-DD') => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Use Intl.DateTimeFormat for standard formats
    if (format === 'long') {
      return new Intl.DateTimeFormat('zh-CN', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit'
      }).format(d);
    }
    
    if (format === 'short') {
      return new Intl.DateTimeFormat('zh-CN', { 
        year: 'numeric', month: 'numeric', day: 'numeric' 
      }).format(d);
    }
    
    // For custom format strings, use the original implementation with global tokens
    const tokens = {
      'YYYY': d.getFullYear(),
      'MM': String(d.getMonth() + 1).padStart(2, '0'),
      'DD': String(d.getDate()).padStart(2, '0'),
      'HH': String(d.getHours()).padStart(2, '0'),
      'mm': String(d.getMinutes()).padStart(2, '0'),
      'ss': String(d.getSeconds()).padStart(2, '0'),
      'M': d.getMonth() + 1,
      'D': d.getDate(),
      'H': d.getHours(),
      'm': d.getMinutes(),
      's': d.getSeconds()
    };
    
    // Replace all tokens in the format string
    return Object.entries(tokens).reduce((result, [token, value]) => {
      return result.replace(new RegExp(token, 'g'), value);
    }, format);
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
    if (num === undefined || num === null || isNaN(Number(num))) return '';
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
  
  // Lighten a color by percentage (uses linear interpolation towards white)
  lightenColor: (hexColor, percent = 30) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#FFFFFF';
    
    // Remove # and handle both 3 and 6 character formats
    let hex = hexColor.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    // Convert to RGB
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    // Linear interpolation towards white to preserve hue
    const ratio = percent / 100;
    const lerp = (c) => Math.round(c + (255 - c) * ratio);
    const rLightened = lerp(r);
    const gLightened = lerp(g);
    const bLightened = lerp(b);
    
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
      earth: '#DEB887',   // Burlywood
      air: '#87CEEB'      // Sky Blue - added for Western astrology compatibility
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
      wood: 'wood',  // Wood is neutral/balanced with itself in some systems
      air: 'earth'   // Air is opposite to earth in Western astrology
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
  
  // Improved fetch wrapper for templates with timeout and error handling
  async simpleFetch(url, options = {}) {
    try {
      // Add reasonable defaults and timeout handling
      const fetchOptions = {
        headers: { 'Accept': 'application/json', ...options.headers },
        timeout: options.timeout || 5000, // 5-second default timeout
        ...options
      };
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const { signal } = controller;
      
      // Set up timeout
      const timeoutId = setTimeout(() => controller.abort(), fetchOptions.timeout);
      
      try {
        // Use node-fetch compatibility for server environments
        const fetchFn = typeof global !== 'undefined' && global.fetch ? global.fetch : fetch;
        
        const response = await fetchFn(url, { ...fetchOptions, signal });
        clearTimeout(timeoutId);
        
        // Handle different response types
        if (options.responseType === 'text') {
          return await response.text();
        } else {
          return await response.json();
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request to ${url} timed out after ${fetchOptions.timeout}ms`);
        }
        throw fetchError;
      }
    } catch (error) {
      console.error(`Error fetching ${url}:`, error.message);
      return { error: error.message, code: error.code || 'FETCH_ERROR' };
    }
  }
};