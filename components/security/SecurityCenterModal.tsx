import React from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Toggle from '../common/Toggle';
import Icon from '../common/Icon';

interface SecurityCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; email: string; is2faEnabled?: boolean };
  loginActivity: { id: number; event: string; ip: string; location: string; timestamp: Date }[];
  onToggle2FA: (enabled: boolean) => void;
  onChangePassword: () => void;
  onSignOutAll: () => void;
}

const SecurityCenterModal: React.FC<SecurityCenterModalProps> = ({
  isOpen,
  onClose,
  user,
  loginActivity,
  onToggle2FA,
  onChangePassword,
  onSignOutAll,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Security Center" size="large">
      <div className="space-y-6">
        {/* 2FA Section */}
        <div className="p-4 border rounded-lg dark:border-slate-700">
            <h4 className="font-semibold text-brand-text dark:text-slate-200 mb-2">Two-Factor Authentication (2FA)</h4>
            <p className="text-sm text-brand-subtle dark:text-slate-400 mb-4">
                Add an extra layer of security to your account by requiring a code from your authenticator app when you log in.
            </p>
            <Toggle label="Enable 2FA" enabled={!!user.is2faEnabled} onChange={onToggle2FA} />
        </div>

        {/* Password Section */}
        <div className="p-4 border rounded-lg dark:border-slate-700">
            <h4 className="font-semibold text-brand-text dark:text-slate-200 mb-2">Password</h4>
             <p className="text-sm text-brand-subtle dark:text-slate-400 mb-4">
                It's a good practice to use a strong, unique password for your account.
            </p>
            <Button variant="secondary" onClick={onChangePassword}>Change Password</Button>
        </div>

        {/* Login Activity Section */}
        <div>
            <h4 className="font-semibold text-brand-text dark:text-slate-200 mb-2">Recent Login Activity</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {loginActivity.map(event => (
                    <div key={event.id} className={`p-3 rounded-lg flex justify-between items-center ${event.event.includes('Failed') ? 'bg-red-50 dark:bg-red-900/40' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                        <div>
                            <p className={`font-semibold text-sm ${event.event.includes('Failed') ? 'text-red-800 dark:text-red-200' : 'text-brand-text dark:text-slate-200'}`}>{event.event}</p>
                            <p className="text-xs text-brand-subtle dark:text-slate-400">IP: {event.ip} ({event.location})</p>
                        </div>
                        <p className="text-xs text-brand-subtle dark:text-slate-500">{event.timestamp.toLocaleString()}</p>
                    </div>
                ))}
            </div>
             <div className="mt-4">
                <Button variant="secondary" onClick={onSignOutAll}>Sign out of all other devices</Button>
            </div>
        </div>
      </div>
    </Modal>
  );
};

export default SecurityCenterModal;
