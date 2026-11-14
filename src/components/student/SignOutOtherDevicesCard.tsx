import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export function SignOutOtherDevicesCard() {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOutOthers = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setSigningOut(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('You are signed out on all other devices.');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LogOut className="h-5 w-5 text-navy-400" />
          Other devices
        </CardTitle>
        <CardDescription>
          Sign out every other browser or phone where your account is open. This device stays signed in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={handleSignOutOthers} disabled={signingOut}>
          {signingOut && <Loader2 className="h-4 w-4 animate-spin" />}
          {signingOut ? 'Signing out…' : 'Sign out other devices'}
        </Button>
      </CardContent>
    </Card>
  );
}
