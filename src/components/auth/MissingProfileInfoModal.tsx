import React, { useState } from 'react';
import { UserCheck, Loader2, Check } from 'lucide-react';
import { updateUserProfileFields } from '../../services/userService';
import { useProcessingOverlay } from '../../contexts/ProcessingOverlayContext';

interface MissingProfileInfoModalProps {
  isOpen: boolean;
  uid: string;
  email?: string;
  missingFields: string[]; // e.g. ['username', 'displayName']
  onSaved: (updatedFields: { username?: string; displayName?: string; gender?: string; age?: number }) => void;
}

const GENDER_OPTIONS = [
  { id: 'Male', label: 'Male' },
  { id: 'Female', label: 'Female' },
  { id: 'Prefer not to say', label: 'Prefer not to say' }
];

export const MissingProfileInfoModal: React.FC<MissingProfileInfoModalProps> = ({
  isOpen,
  uid,
  missingFields,
  onSaved
}) => {
  const { withProcessing } = useProcessingOverlay();
  const needsUsername = missingFields.includes('username');
  const needsDisplayName = missingFields.includes('displayName');
  const needsGender = missingFields.includes('gender');
  const needsAge = missingFields.includes('age');

  const [username, setUsername] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || (!needsUsername && !needsDisplayName && !needsGender && !needsAge)) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (needsUsername) {
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        setErrorMsg('Username must be at least 3 characters long.');
        return;
      }
      if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
        setErrorMsg('Username can only contain letters, numbers, and underscores.');
        return;
      }
    }

    if (needsDisplayName) {
      if (!displayName.trim()) {
        setErrorMsg('Please enter your name.');
        return;
      }
    }

    if (needsGender && !gender) {
      setErrorMsg('Please select your gender.');
      return;
    }

    let parsedAge: number | undefined = undefined;
    if (needsAge) {
      parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 90) {
        setErrorMsg('Please enter a valid age between 10 and 90.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: { username?: string; displayName?: string; gender?: string; age?: number } = {};
      if (needsUsername) payload.username = username.trim().toLowerCase();
      if (needsDisplayName) payload.displayName = displayName.trim();
      if (needsGender) payload.gender = gender;
      if (needsAge && parsedAge !== undefined) payload.age = parsedAge;

      if (Object.keys(payload).length > 0) {
        await withProcessing({
          message: 'Saving Profile • Please wait',
          submessage: 'Completing your Davao student account'
        }, async () => {
          await updateUserProfileFields(uid, payload);
        });
      }

      onSaved(payload);
    } catch (err: any) {
      console.warn('Profile save note:', err);
      setErrorMsg(err?.message || 'Could not save information right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    if (needsGender || needsAge) return 'Personal Information Update';
    return 'Complete Your Profile';
  };

  const getSubtitle = () => {
    if (needsGender || needsAge) {
      return 'Please provide your basic personal information to keep your student profile updated.';
    }
    return 'Please fill in the required info to keep your student profile updated.';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm sheet-backdrop-enter">
      <div className="bg-[var(--card-bg)] w-full max-w-sm rounded-3xl border border-[var(--card-border)] shadow-2xl p-6 space-y-5 sheet-enter-spring max-h-[90vh] overflow-y-auto">
        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[var(--text-primary)]">
            {getTitle()}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {getSubtitle()}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Core Profile Fields (Username & Name) */}
          {needsUsername && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Username <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={30}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30));
                  setErrorMsg(null);
                }}
                placeholder="e.g. davao_student"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] text-xs font-semibold focus:outline-hidden focus:border-[var(--btn-primary-bg)]"
              />
            </div>
          )}

          {needsDisplayName && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={50}
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value.slice(0, 50));
                  setErrorMsg(null);
                }}
                placeholder="Your full or preferred name"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] text-xs font-semibold focus:outline-hidden focus:border-[var(--btn-primary-bg)]"
              />
            </div>
          )}

          {/* Gender Field */}
          {needsGender && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Gender <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {GENDER_OPTIONS.map((opt) => {
                  const selected = gender === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setGender(opt.id);
                        setErrorMsg(null);
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all pressable ${
                        selected
                          ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)]/10 text-[var(--text-primary)]'
                          : 'border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {selected && <Check className="w-4 h-4 text-sky-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Age Field */}
          {needsAge && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Age <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={10}
                max={90}
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Enter your age (e.g. 19)"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] text-xs font-semibold focus:outline-hidden focus:border-[var(--btn-primary-bg)]"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="text-xs text-rose-500 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 text-center font-medium animate-shake">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-md flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 pressable"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <span>Save &amp; Continue</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
