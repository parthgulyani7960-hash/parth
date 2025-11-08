import React from 'react';

interface PasswordStrengthIndicatorProps {
  password?: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password = '' }) => {
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (!pass) return -1;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = calculateStrength(password);
  
  if (strength === -1) return null;

  const strengthLevels = [
    { text: 'Weak', color: 'bg-red-500', width: '20%' },
    { text: 'Weak', color: 'bg-red-500', width: '20%' },
    { text: 'Medium', color: 'bg-yellow-500', width: '40%' },
    { text: 'Good', color: 'bg-sky-500', width: '60%' },
    { text: 'Strong', color: 'bg-emerald-500', width: '80%' },
    { text: 'Very Strong', color: 'bg-emerald-500', width: '100%' },
  ];

  const currentLevel = strengthLevels[strength];

  return (
    <div className="mt-2">
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${currentLevel.color}`} 
          style={{ width: currentLevel.width }}
        ></div>
      </div>
      <p className="text-xs text-right mt-1 text-brand-subtle dark:text-slate-400">
        Password strength: <span className="font-semibold">{currentLevel.text}</span>
      </p>
    </div>
  );
};

export default PasswordStrengthIndicator;
