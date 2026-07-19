import { Check, Link2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';

const currentPublicUrl = () => new URL(`${window.location.pathname}${window.location.search}`, window.location.origin).toString();

export function ShareLinkButton() {
  const [status, setStatus] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const statusTimer = useRef<number | null>(null);

  useEffect(() => () => { if (statusTimer.current) window.clearTimeout(statusTimer.current); }, []);

  const announce = (message: string) => {
    setStatus(message);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(''), 2800);
  };
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      announce('Ссылка скопирована');
      return true;
    } catch {
      setFallbackUrl(url);
      announce('Скопируйте ссылку вручную');
      return false;
    }
  };
  const share = async () => {
    const url = currentPublicUrl();
    const mobile = window.matchMedia('(max-width: 768px)').matches;
    if (mobile && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: document.title, url });
        announce('Ссылка отправлена');
        return;
      } catch {
        await copy(url);
        return;
      }
    }
    await copy(url);
  };

  return <>
    <Button variant="ghost" onClick={() => void share()} aria-label="Поделиться ссылкой" title="Ссылка"><Link2 size={17} aria-hidden="true" /><span className="desktop-label">Ссылка</span></Button>
    <span className="sr-only" role="status" aria-live="polite">{status}</span>
    {status ? <span className="header-action-status" aria-hidden="true"><Check size={14} />{status}</span> : null}
    {fallbackUrl ? <section className="share-link-fallback" role="dialog" aria-label="Ручное копирование ссылки"><header><strong>Скопируйте ссылку</strong><button onClick={() => setFallbackUrl('')} aria-label="Закрыть ручное копирование"><X size={18} aria-hidden="true" /></button></header><input readOnly value={fallbackUrl} onFocus={(event) => event.currentTarget.select()} aria-label="Ссылка на текущий контекст" autoFocus /><Button variant="outline" onClick={() => void copy(fallbackUrl)}>Копировать</Button></section> : null}
  </>;
}
