import React from 'react';
import { HelpCircle, Lightbulb, CheckCircle2, BookOpen } from 'lucide-react';

export type TextClaritySize = 'standard' | 'large' | 'extra_large';

interface FormattedTextProps {
  content: string;
  size?: TextClaritySize;
  className?: string;
  showQuestionHighlight?: boolean;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  content,
  size = 'large',
  className = '',
  showQuestionHighlight = true,
}) => {
  if (!content) return null;

  // Text size classes for optimal readability
  const sizeClasses = {
    standard: 'text-sm sm:text-base leading-relaxed',
    large: 'text-base sm:text-lg leading-relaxed font-normal',
    extra_large: 'text-lg sm:text-xl leading-loose font-normal',
  }[size];

  // Helper to parse inline markdown (bold **text**, italic *text*, `code`)
  const renderInline = (text: string) => {
    // Split by bold (**...**) and code (`...`)
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        return (
          <strong
            key={index}
            className="font-extrabold text-slate-950 dark:text-white bg-amber-100/70 dark:bg-amber-950/40 text-slate-900 dark:text-amber-200 px-1.5 py-0.5 rounded-sm mx-0.5 transition-colors"
          >
            {inner}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        const inner = part.slice(1, -1);
        return (
          <code
            key={index}
            className="font-mono text-xs sm:text-sm bg-slate-200 dark:bg-slate-800 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold"
          >
            {inner}
          </code>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Split into paragraphs / lines
  const rawParagraphs = content.split(/\n\s*\n/);

  return (
    <div className={`space-y-3.5 text-slate-900 dark:text-slate-100 ${sizeClasses} ${className}`}>
      {rawParagraphs.map((para, pIdx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Check if paragraph is a section header (e.g. ### Header or ## Header)
        if (trimmed.startsWith('#')) {
          const levelMatch = trimmed.match(/^(#+)\s*(.*)$/);
          if (levelMatch) {
            const headerText = levelMatch[2];
            const isQuestionHeader = headerText.toLowerCase().includes('question') || headerText.includes('❓');
            const isAnswerHeader = headerText.toLowerCase().includes('answer') || headerText.includes('💡') || headerText.toLowerCase().includes('explanation');

            return (
              <div
                key={pIdx}
                className={`flex items-center gap-2 pt-2 pb-1 font-bold tracking-tight ${
                  isQuestionHeader
                    ? 'text-blue-700 dark:text-blue-300 text-base sm:text-lg border-b-2 border-blue-200 dark:border-blue-900'
                    : isAnswerHeader
                    ? 'text-emerald-700 dark:text-emerald-300 text-base sm:text-lg border-b-2 border-emerald-200 dark:border-emerald-900'
                    : 'text-slate-950 dark:text-white text-base sm:text-lg border-b border-slate-200 dark:border-slate-800'
                }`}
              >
                {isQuestionHeader && <HelpCircle className="h-5 w-5 shrink-0 text-blue-600" />}
                {isAnswerHeader && <Lightbulb className="h-5 w-5 shrink-0 text-emerald-600" />}
                <span>{renderInline(headerText)}</span>
              </div>
            );
          }
        }

        // Check for special Question highlight callout block
        if (
          showQuestionHighlight &&
          (trimmed.startsWith('❓ Question:') ||
            trimmed.startsWith('Question:') ||
            trimmed.startsWith('### Question') ||
            trimmed.startsWith('Practice Question:'))
        ) {
          return (
            <div
              key={pIdx}
              className="rounded-2xl border-2 border-blue-400 bg-blue-50/90 p-4.5 sm:p-5 text-slate-950 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-50 shadow-sm"
            >
              <div className="flex items-center gap-2 font-extrabold text-blue-800 dark:text-blue-300 text-xs sm:text-sm uppercase tracking-wider mb-2">
                <HelpCircle className="h-4 w-4" />
                <span>Question to Answer:</span>
              </div>
              <div className="font-semibold text-slate-950 dark:text-white">
                {renderInline(trimmed.replace(/^(❓\s*Question:|Question:|###\s*Question:?|Practice Question:?)\s*/i, ''))}
              </div>
            </div>
          );
        }

        // Check for special Answer highlight callout block
        if (
          showQuestionHighlight &&
          (trimmed.startsWith('💡 Answer:') ||
            trimmed.startsWith('Answer:') ||
            trimmed.startsWith('Model Answer:') ||
            trimmed.startsWith('Direct Answer:'))
        ) {
          return (
            <div
              key={pIdx}
              className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/90 p-4.5 sm:p-5 text-slate-950 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-50 shadow-sm"
            >
              <div className="flex items-center gap-2 font-extrabold text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm uppercase tracking-wider mb-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Clear Answer:</span>
              </div>
              <div className="font-semibold text-slate-950 dark:text-white">
                {renderInline(trimmed.replace(/^(💡\s*Answer:|Answer:|Model Answer:|Direct Answer:)\s*/i, ''))}
              </div>
            </div>
          );
        }

        // Check for Blockquote
        if (trimmed.startsWith('>')) {
          const quoteLines = trimmed
            .split('\n')
            .map((l) => l.replace(/^>\s*/, ''))
            .join('\n');
          return (
            <blockquote
              key={pIdx}
              className="border-l-4 border-blue-500 bg-slate-50 dark:bg-slate-800/80 pl-4 py-2 my-2 italic text-slate-800 dark:text-slate-200 rounded-r-xl"
            >
              {renderInline(quoteLines)}
            </blockquote>
          );
        }

        // Bulleted lists
        if (trimmed.includes('\n- ') || trimmed.includes('\n• ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const lines = trimmed.split('\n');
          return (
            <ul key={pIdx} className="space-y-2 pl-2">
              {lines.map((line, lIdx) => {
                const bulletMatch = line.match(/^[-•*]\s*(.*)$/);
                if (bulletMatch) {
                  return (
                    <li key={lIdx} className="flex items-start gap-2.5">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                      <span className="flex-1">{renderInline(bulletMatch[1])}</span>
                    </li>
                  );
                }
                return (
                  <p key={lIdx} className="leading-relaxed">
                    {renderInline(line)}
                  </p>
                );
              })}
            </ul>
          );
        }

        // Regular paragraph with line breaks
        const lines = trimmed.split('\n');
        return (
          <p key={pIdx} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInline(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
