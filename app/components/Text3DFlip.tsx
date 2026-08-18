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

  const words = useMemo(
    () =>
      text.split(' ').map((word, wordIndex, allWords) => ({
        characters: Array.from(word),
        needsSpace: wordIndex !== allWords.length - 1,
      })),
    [text]
  );

  let offset = 0;
  const Tag = as as keyof JSX.IntrinsicElements;

  return (
    <Tag
      className={['tc-flip-text', className].filter(Boolean).join(' ')}
      style={style}
      aria-label={ariaLabel ?? text}
    >
      {words.map((word, wordIndex) => {
        const start = offset;
        offset += word.characters.length;

        return (
          <span className="tc-flip-word" key={`${wordIndex}-${start}`} aria-hidden="true">
            {word.characters.map((char, charIndex) => (
              <CharBox
                key={`${cycle}-${start}-${charIndex}-${char}`}
                char={char}
                index={start + charIndex}
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
