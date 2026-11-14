import { useState, type ChangeEvent } from 'react';
import { Paperclip, X, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';

const MAX_BYTES = 15 * 1024 * 1024;

interface MediaUploadProps {
  folder: string;
  accept: string;
  label: string;
  value: string | null;
  onChange: (path: string | null) => void;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
}

export function MediaUpload({ folder, accept, label, value, onChange }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error('File is larger than 15 MB.');
      return;
    }
    setUploading(true);
    const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from('question-media').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error('Upload failed. Check the file type and try again.');
      return;
    }
    onChange(path);
  }

  async function openFile() {
    if (!value) return;
    const { data, error } = await supabase.storage.from('question-media').createSignedUrl(value, 300);
    if (error || !data?.signedUrl) {
      toast.error('Could not open the file.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-navy-700">{label}</span>
      {value ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#E5E4F2] bg-white px-3 py-2 text-sm">
          <Paperclip className="h-4 w-4 text-navy-500" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-navy-700">{value.split('/').pop()}</span>
          <Button type="button" variant="ghost" size="sm" onClick={openFile}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} aria-label="Remove file">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#C9C7E0] px-3 py-2 text-sm text-navy-600 transition-colors hover:bg-[#F5F3FF] focus-within:ring-2 focus-within:ring-govt-400">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Paperclip className="h-4 w-4" aria-hidden="true" />}
          <span>{uploading ? 'Uploading...' : 'Choose file'}</span>
          <input type="file" accept={accept} className="sr-only" onChange={handleFile} disabled={uploading} />
        </label>
      )}
    </div>
  );
}
