import React, { useState } from 'react';
import { ExternalLink, Github, Copy, Check, Link2 } from 'lucide-react';

interface FormattedMessageTextProps {
  text: string;
  isMe: boolean;
}

// Regex to capture full URLs including http://, https://, and bare github.com/... or www....
const URL_REGEX = /(https?:\/\/[^\s]+|github\.com\/[^\s]+|www\.[^\s]+)/gi;

export const FormattedMessageText: React.FC<FormattedMessageTextProps> = ({ text, isMe }) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => {
      setCopiedUrl(null);
    }, 2000);
  };

  // Find all URLs in message
  const detectedUrls: string[] = [];
  let match: RegExpExecArray | null;
  const regexClone = new RegExp(URL_REGEX);
  while ((match = regexClone.exec(text)) !== null) {
    let cleanUrl = match[0];
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    if (!detectedUrls.includes(cleanUrl)) {
      detectedUrls.push(cleanUrl);
    }
  }

  // Split and render inline tokens
  const parts = text.split(URL_REGEX);

  return (
    <div className="space-y-2">
      <p className="leading-relaxed whitespace-pre-wrap break-words">
        {parts.map((part, idx) => {
          if (!part) return null;
          const isUrl = URL_REGEX.test(part);
          // Reset regex lastIndex
          URL_REGEX.lastIndex = 0;

          if (isUrl) {
            let fullUrl = part;
            if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
              fullUrl = 'https://' + fullUrl;
            }
            const isGithub = fullUrl.toLowerCase().includes('github.com');

            return (
              <a
                key={idx}
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center gap-1 font-medium transition underline decoration-1 underline-offset-2 ${
                  isMe
                    ? 'text-amber-200 hover:text-white decoration-amber-300/60'
                    : isGithub
                    ? 'text-emerald-400 hover:text-emerald-300 decoration-emerald-500/60'
                    : 'text-sky-400 hover:text-sky-300 decoration-sky-500/60'
                }`}
                title={`Open ${fullUrl} in new tab`}
              >
                {isGithub ? (
                  <Github className="w-3.5 h-3.5 inline shrink-0" />
                ) : (
                  <Link2 className="w-3.5 h-3.5 inline shrink-0" />
                )}
                <span>{part}</span>
                <ExternalLink className="w-3 h-3 inline shrink-0 opacity-70" />
              </a>
            );
          }

          return <span key={idx}>{part}</span>;
        })}
      </p>

      {/* Rich URL Preview Cards if links detected */}
      {detectedUrls.length > 0 && (
        <div className="pt-1 space-y-1.5">
          {detectedUrls.map((url, i) => {
            const isGithub = url.toLowerCase().includes('github.com');
            const isCopied = copiedUrl === url;

            // Extract display label
            let label = url.replace(/^https?:\/\//, '');
            if (label.length > 40) {
              label = label.slice(0, 37) + '...';
            }

            return (
              <div
                key={i}
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition ${
                  isMe
                    ? 'bg-emerald-700/60 border-emerald-500/40 text-slate-100'
                    : 'bg-slate-950/70 border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 min-w-0 flex-1 hover:underline cursor-pointer"
                  title="Open URL"
                >
                  {isGithub ? (
                    <Github className="w-4 h-4 text-slate-200 shrink-0" />
                  ) : (
                    <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate font-mono text-[11px]">{label}</span>
                </a>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(e, url)}
                    className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition cursor-pointer"
                    title={isCopied ? 'Copied!' : 'Copy URL'}
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition cursor-pointer"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
