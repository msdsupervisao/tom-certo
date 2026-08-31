'use client';

import { memo, useEffect, useMemo, useState } from 'react';

type TextTag = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
type RotateDirection = 'top' | 'bottom';

interface Text3DFlipProps {
  text: string;
  as?: TextTag;
  color?: string;
  flipColor?: string;
  rotateDirection?: RotateDirection;
  repeatMs?: number;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

interface CharBoxProps {
  char: string;
  index: number;
  color: string;
  flipColor: string;
  rotateDirection: RotateDirection;
}

const CharBox = memo(function CharBox({
  char,
  index,
  color,
  flipColor,
  rotateDirection,
}: CharBoxProps) {
  return (
    <span
      className="tc-flip-char"
      data-direction={rotateDirection}
      style={
        {
          '--tc-flip-index': index,
          '--tc-flip-front-color': color,
          '--tc-flip-back-color': flipColor,
        } as React.CSSProperties
      }
    >
      <span className="tc-flip-face tc-flip-front">{char}</span>
      <span className="tc-flip-face tc-flip-back">{char}</span>
    </span>
  );
});

export default function Text3DFlip({
  text,
  as = 'span',
  color = 'var(--tc-txt)',
  flipColor = 'var(--tc-gold)',
  rotateDirection = 'top',
  repeatMs = 3200,
  className,
  style,
  ariaLabel,
}: Text3DFlipProps) {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (repeatMs <= 0) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    const timer = window.setInterval(() => {
      setCycle((current) => current + 1);
    }, repeatMs);

    return () => window.clearInterval(timer);
  }, [repeatMs]);

  const words = useMemo(() => {
    const parts = text.split(' ');
    return parts.map((word, wordIndex) => ({
      characters: Array.from(word),
      needsSpace: wordIndex !== parts.length - 1,
      start: parts.slice(0, wordIndex).reduce((total, part) => total + Array.from(part).length, 0),
    }));
  }, [text]);

  const Tag = as;

  return (
    <Tag
      className={['tc-flip-text', className].filter(Boolean).join(' ')}
      style={style}
      aria-label={ariaLabel ?? text}
    >
      {words.map((word, wordIndex) => {
        return (
          <span className="tc-flip-word" key={`${wordIndex}-${word.start}`} aria-hidden="true">
            {word.characters.map((char, charIndex) => (
              <CharBox
                key={`${cycle}-${word.start}-${charIndex}-${char}`}
                char={char}
                index={word.start + charIndex}
                color={color}
                flipColor={flipColor}
                rotateDirection={rotateDirection}
              />
            ))}
            {word.needsSpace ? <span className="tc-flip-space"> </span> : null}
          </span>
        );
      })}
    </Tag>
  );
}
