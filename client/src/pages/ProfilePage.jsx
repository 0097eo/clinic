import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { changePassword, updateCurrentUser } from '../services/api';

export function ProfilePage() {
  const { user, token, refreshUser } = useAuth();

  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', department: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || '',
        phone: user.phone || '',
        department: user.department || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token, refreshUser]);

  const handleProfileFieldChange = (field) => (event) => {
    const { value } = event.target;
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    setProfileError(null);
    setProfileSuccess(null);
  };

  const handlePasswordFieldChange = (field) => (event) => {
    const { value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!token) return;
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const payload = {
        fullName: profileForm.fullName.trim(),
        phone: profileForm.phone.trim(),
        department: profileForm.department.trim()
      };

      await updateCurrentUser(payload, token);
      await refreshUser();
      setProfileSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Failed to update profile', err);
      setProfileError(err?.details?.message || err?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!token) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      setPasswordSuccess(null);
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      await changePassword(
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        token
      );
      setPasswordSuccess('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Failed to update password', err);
      setPasswordError(err?.details?.message || err?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader title="Profile" subtitle="Manage your account" />

      <div className="panel">
        <h2 className="panel__title">Personal details</h2>
        {profileError ? <p className="form-error">{profileError}</p> : null}
        {profileSuccess ? <p className="form-success">{profileSuccess}</p> : null}
        <form className="form-grid" onSubmit={handleProfileSubmit}>
          <label>
            Full name
            <input
              required
              value={profileForm.fullName}
              onChange={handleProfileFieldChange('fullName')}
              autoComplete="name"
            />
          </label>
          <label>
            Email
            <input value={user?.email || ''} disabled autoComplete="email" />
          </label>
          <label>
            Phone
            <input
              value={profileForm.phone}
              onChange={handleProfileFieldChange('phone')}
              placeholder="+254700000000"
              autoComplete="tel"
            />
          </label>
          <label>
            Department
            <input
              value={profileForm.department}
              onChange={handleProfileFieldChange('department')}
              placeholder="Reception, Pharmacy, etc."
              autoComplete="organization-title"
            />
          </label>
          <label>
            Role
            <input value={user?.role || ''} disabled />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={profileLoading} className="action-primary">
              {profileLoading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2 className="panel__title">Change password</h2>
        {passwordError ? <p className="form-error">{passwordError}</p> : null}
        {passwordSuccess ? <p className="form-success">{passwordSuccess}</p> : null}
        <form className="form-grid" onSubmit={handlePasswordSubmit}>
          <label>
            Current password
            <input
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange('currentPassword')}
              autoComplete="current-password"
            />
          </label>
          <label>
            New password
            <input
              type="password"
              required
              value={passwordForm.newPassword}
              onChange={handlePasswordFieldChange('newPassword')}
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              required
              value={passwordForm.confirmPassword}
              onChange={handlePasswordFieldChange('confirmPassword')}
              autoComplete="new-password"
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={passwordLoading} className="action-primary">
              {passwordLoading ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
