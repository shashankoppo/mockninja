import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

interface PersonalDetailsDialogProps {
  onClose: () => void;
}

const PHONE_PATTERN = /^\+?[\d\s-]{10,15}$/;

export function PersonalDetailsDialog({ onClose }: PersonalDetailsDialogProps) {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const { data: phoneData, isLoading, isError } = useQuery({
    queryKey: ['profile-phone', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Dialog open onClose={onClose} title="Edit personal details">
        <Skeleton className="h-32 w-full" />
      </Dialog>
    );
  }

  if (isError || !phoneData) {
    return (
      <Dialog open onClose={onClose} title="Edit personal details">
        <p className="text-sm text-red-600">Your details could not be loaded. Please try again.</p>
      </Dialog>
    );
  }

  return <PersonalDetailsForm initialName={profile?.full_name || ''} initialPhone={phoneData.phone || ''} onClose={onClose} />;
}

function PersonalDetailsForm({ initialName, initialPhone, onClose }: { initialName: string; initialPhone: string; onClose: () => void }) {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) {
      toast.error('Please enter your name.');
      return;
    }
    if (trimmedPhone && !PHONE_PATTERN.test(trimmedPhone)) {
      toast.error('Please enter a valid phone number (10-15 digits).');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmedName, phone: trimmedPhone || null })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Profile updated');
    queryClient.invalidateQueries({ queryKey: ['prefs', user.id] });
    queryClient.invalidateQueries({ queryKey: ['profile-phone', user.id] });
    await refreshProfile();
    onClose();
  };

  const inputClass = 'w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-900 focus:border-govt-500 focus:outline-none focus:ring-1 focus:ring-govt-500';

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit personal details"
      description="Your name and phone number are used on your account and for exam notifications."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-navy-700">Full name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-navy-700">Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className={inputClass}
          />
        </div>
      </div>
    </Dialog>
  );
}
