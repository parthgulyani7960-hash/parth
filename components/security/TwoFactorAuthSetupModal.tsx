import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Icon from '../common/Icon';
import Spinner from '../common/Spinner';

interface TwoFactorAuthSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TwoFactorAuthSetupModal: React.FC<TwoFactorAuthSetupModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [code, setCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = () => {
        setError('');
        if (code.length !== 6) {
            setError('Please enter a 6-digit code.');
            return;
        }
        setIsVerifying(true);
        setTimeout(() => {
            // Mock verification logic
            if (code === '123456') {
                onSuccess();
            } else {
                setError('Invalid code. Please try again.');
            }
            setIsVerifying(false);
        }, 1000);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(value);
    }


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Up Two-Factor Authentication">
      <div className="space-y-4">
        <p className="text-sm text-brand-subtle dark:text-slate-400">
            1. Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy).
        </p>
        <div className="p-4 bg-white rounded-lg inline-block mx-auto">
            {/* Mock QR Code SVG */}
            <svg width="128" height="128" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="#fff"/>
                <path fill="#000" d="M10 10h20v20h-20z M40 10h20v20h-20z M70 10h20v20h-20z M10 40h20v20h-20z M40 40h20v20h-20z M70 40h20v20h-20z M10 70h20v20h-20z M40 70h20v20h-20z M70 70h20v20h-20z M15 15h10v10h-10z M45 15h10v10h-10z M75 15h10v10h-10z M15 45h10v10h-10z M45 45h10v10h-10z M75 45h10v10h-10z M15 75h10v10h-10z M45 75h10v10h-10z M75 75h10v10h-10z"/>
            </svg>
        </div>
        <p className="text-sm text-brand-subtle dark:text-slate-400">
            Or, manually enter this setup key: <br />
            <strong className="font-mono text-brand-text dark:text-slate-200">ABCD EFGH IJKL MNOP</strong>
        </p>
        <hr className="dark:border-slate-700" />
        <p className="text-sm text-brand-subtle dark:text-slate-400">
            2. Enter the 6-digit code from your app to verify the setup.
        </p>
        <div>
            <input
                type="text"
                value={code}
                onChange={handleInput}
                maxLength={6}
                className="w-full p-3 text-2xl text-center tracking-[0.5em] border rounded-lg dark:bg-slate-800"
                placeholder="------"
            />
            {error && <p className="text-red-500 text-sm mt-1 text-center">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleVerify} isLoading={isVerifying}>Verify & Enable</Button>
        </div>
      </div>
    </Modal>
  );
};

export default TwoFactorAuthSetupModal;
