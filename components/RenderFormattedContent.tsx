'use client';

import React from 'react';

interface RenderFormattedContentProps {
  content: string;
  className?: string;
}

export function RenderFormattedContent({ content, className = '' }: RenderFormattedContentProps) {
  if (!content) return null;

  // 1. Bersihkan atau normalisasi format teks
  // Jika teks mengandung tag <p> atau </p>, ekstrak teks per paragraf
  let paragraphs: string[] = [];

  if (content.includes('<p>') || content.includes('</p>')) {
    paragraphs = content
      .replace(/<p[^>]*>/gi, '')
      .split(/<\/p>/gi)
      .map(p => p.replace(/<br\s*[\/]?>/gi, '\n').trim())
      .filter(p => p.length > 0);
  } else {
    // Normalisasi baris baru Windows / Unix (\r\n -> \n)
    const normalized = content.replace(/\r\n/g, '\n');
    paragraphs = normalized
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  // Jika tetap kosong (misal cuma spasi), gunakan fallback
  if (paragraphs.length === 0 && content.trim()) {
    paragraphs = [content.trim()];
  }

  // Helper untuk memformat markdown sederhana: **bold**, *italic*
  const formatInlineText = (text: string) => {
    // Pisahkan baris jika ada \n tunggal di dalam paragraf
    const lines = text.split('\n');

    return lines.map((line, lineIdx) => {
      // Cek apakah list item (- atau *)
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
      const cleanLine = isBullet ? line.trim().replace(/^[-•]\s*/, '') : line;

      // Parse bold & italic
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3/g;
      let match;

      while ((match = regex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanLine.substring(lastIndex, match.index));
        }
        if (match[2]) {
          // Bold
          parts.push(<strong key={`${lineIdx}-${match.index}`} className="font-semibold text-slate-900 dark:text-white">{match[2]}</strong>);
        } else if (match[4]) {
          // Italic
          parts.push(<em key={`${lineIdx}-${match.index}`} className="italic">{match[4]}</em>);
        }
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < cleanLine.length) {
        parts.push(cleanLine.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <li key={lineIdx} className="ml-5 list-disc text-slate-700 dark:text-slate-300 my-1">
            {parts}
          </li>
        );
      }

      return (
        <React.Fragment key={lineIdx}>
          {parts}
          {lineIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div className={`space-y-4 text-slate-700 dark:text-slate-300 ${className}`}>
      {paragraphs.map((para, index) => {
        // Jika seluruh baris adalah list item
        if (para.split('\n').every(l => l.trim().startsWith('- ') || l.trim().startsWith('• '))) {
          return (
            <ul key={index} className="list-disc pl-4 space-y-1 my-3">
              {formatInlineText(para)}
            </ul>
          );
        }

        return (
          <p key={index} className="leading-relaxed text-base sm:text-lg">
            {formatInlineText(para)}
          </p>
        );
      })}
    </div>
  );
}
