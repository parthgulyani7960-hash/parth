import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { useToast } from '../../hooks/useToast';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onSave }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const addToast = useToast();

  const handleSave = () => {
    setError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
    }

    // Simulate save
    onSave();
    // Reset state for next time
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div>
          <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-slate-800 border-slate-300 dark:border-slate-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-slate-800 border-slate-300 dark:border-slate-600"
          />
          <PasswordStrengthIndicator password={newPassword} />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-text dark:text-slate-300 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-slate-800 border-slate-300 dark:border-slate-600"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
