import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, MessageCircle, Send, Clock, ShieldCheck, Phone, MapPin } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { usePublicSettings } from '@/lib/queries';

export function ContactPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { data: settings } = usePublicSettings();

  const desks = settings?.contact_desks ?? [];
  const supportEmail = settings?.support_email || desks.find((d) => d.email)?.email || '';
  const whatsappNumber = desks.find((d) => d.whatsapp)?.whatsapp || '';
  const responseTime = desks.find((d) => d.response_time)?.response_time || '';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);

    const inquiryId = crypto.randomUUID();
    const { error } = await supabase.from('support_inquiries').insert({
      id: inquiryId,
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim() || 'General support',
      message: message.trim(),
    });

    if (error) {
      setSending(false);
      toast.error('We could not send your message. Please try again.');
      return;
    }

    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          inquiry_id: inquiryId,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim() || 'General support',
          message: message.trim(),
        }),
      });
    } catch {
      // Notification is best-effort; the inquiry itself is already saved.
    }

    setSending(false);
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    toast.success(t('contact.sent'));
  };

  return (
    <PublicLayout>
      <div className="container-app py-10">
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.08] to-vibe-500/[.08] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-teal-300">Support desk</p>
          <h1 className="mt-3 text-3xl font-bold text-navy-900 govt-heading sm:text-4xl">{t('contact.title')}</h1>
          <p className="mt-2 max-w-2xl text-navy-500">{t('contact.subtitle')}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4">
            {whatsappNumber && (
              <Card className="transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-teal-300/30">
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366]"><MessageCircle className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{t('contact.whatsappSupport')}</p>
                    <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="text-xs text-navy-500 hover:text-teal-300">+{whatsappNumber}</a>
                  </div>
                </CardContent>
              </Card>
            )}
            {supportEmail && (
              <Card className="transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-teal-300/30">
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-100 text-govt-700"><Mail className="h-5 w-5" /></div>
                  <a href={`mailto:${supportEmail}`} className="group">
                    <p className="text-sm font-semibold text-navy-900 group-hover:text-govt-700">{t('contact.emailSupport')}</p>
                    <p className="text-xs text-navy-500">{supportEmail}</p>
                  </a>
                </CardContent>
              </Card>
            )}
            {responseTime && (
              <Card className="transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-teal-300/30">
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Clock className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{t('contact.responseTime')}</p>
                    <p className="text-xs text-navy-500">{responseTime}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {desks.filter((d) => d.phone || d.address).map((desk) => (
              <Card key={desk.label} className="transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-teal-300/30">
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-govt-100 text-govt-700">
                    {desk.phone ? <Phone className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{desk.label}</p>
                    {desk.phone && <p className="text-xs text-navy-500">{desk.phone}</p>}
                    {desk.address && <p className="text-xs text-navy-500">{desk.address}</p>}
                    {desk.hours && <p className="text-xs text-navy-400">{desk.hours}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="flex items-start gap-2 px-1 text-xs leading-5 text-navy-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />Your message is sent securely to the support team for review.</div>
          </div>

          <Card className="lg:col-span-2"><CardContent className="p-6 sm:p-8"><form onSubmit={handleSubmit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium text-navy-700">{t('contact.name')}</label><input type="text" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} className="min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-navy-400 focus:border-teal-300 focus:ring-2 focus:ring-teal-300/20" /></div><div><label className="mb-1 block text-sm font-medium text-navy-700">{t('contact.email')}</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={320} className="min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-navy-400 focus:border-teal-300 focus:ring-2 focus:ring-teal-300/20" /></div></div><div><label className="mb-1 block text-sm font-medium text-navy-700">{t('contact.subject')}</label><input type="text" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} className="min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-teal-300 focus:ring-2 focus:ring-teal-300/20" /></div><div><label className="mb-1 block text-sm font-medium text-navy-700">{t('contact.message')}</label><textarea value={message} onChange={(event) => setMessage(event.target.value)} required minLength={10} maxLength={5000} rows={6} className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-navy-400 focus:border-teal-300 focus:ring-2 focus:ring-teal-300/20" /></div><Button type="submit" variant="primary" loading={sending}><Send className="h-4 w-4" />{t('contact.send')}</Button></form></CardContent></Card>
        </div>
      </div>
    </PublicLayout>
  );
}
