import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface GoogleSignInButtonProps {
  onError: (message: string) => void;
}

export function GoogleSignInButton({ onError }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setLoading(false);
      onError(error.message);
    }
  };

  return (
    <Button type="button" variant="outline" fullWidth loading={loading} onClick={handleClick}>
      Continue with Google
    </Button>
  );
}
