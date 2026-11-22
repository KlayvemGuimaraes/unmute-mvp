import type { InterviewAvatar } from '@/types/conversation';
import Image from 'next/image';

export function OuviraMark({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <Image
      src="/ouvira-mark.png"
      alt=""
      aria-hidden="true"
      className={`${className} mix-blend-multiply`}
      width={650}
      height={650}
    />
  );
}

export function OuviraWordmark({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex" role="img" aria-label="Ouvira">
        <OuviraMark className="h-9 w-9" />
      </span>
    );
  }

  return (
    <Image
      src="/ouvira-wordmark.png"
      alt="Ouvira"
      className="h-auto w-[11.5rem] max-w-full mix-blend-multiply sm:w-[12.5rem]"
      width={820}
      height={300}
      priority
    />
  );
}

export function OuviraAgentPortrait({
  avatar,
  className = 'h-36 w-36',
}: {
  avatar: InterviewAvatar;
  className?: string;
}) {
  const isClara = avatar === 'clara';
  const label = isClara ? 'Clara' : 'Miguel';

  return (
    <svg
      aria-label={'Ilustração de ' + label}
      className={className}
      role="img"
      viewBox="0 0 220 220"
      fill="none"
    >
      <rect
        x="5"
        y="5"
        width="210"
        height="210"
        rx="66"
        fill={isClara ? '#E8F5F3' : '#EAF2F8'}
      />
      <circle cx="164" cy="48" r="37" fill="#FFFFFF" fillOpacity=".42" />
      <path
        d="M24 220c5-43 31-68 72-75l14 16 14-16c41 7 67 32 72 75H24Z"
        fill={isClara ? '#167F83' : '#286A94'}
      />
      <path d="m91 149 19 18 19-18 12 9-15 62h-32l-15-62 12-9Z" fill="#F7FBFC" />
      <path
        d="M94 128h32v35l-16 15-16-15v-35Z"
        fill={isClara ? '#D99A78' : '#CE8C69'}
      />

      {isClara ? (
        <>
          <path
            d="M66 91c-2-40 15-65 44-65 31 0 48 25 45 65l-4 54c-2 25-17 39-41 39s-39-14-41-39l-3-54Z"
            fill="#342A31"
          />
          <ellipse cx="110" cy="91" rx="32" ry="43" fill="#E9B99A" />
          <path
            d="M77 78c2-28 15-43 36-43 21 0 34 14 34 41-11-4-20-12-25-23-10 13-25 21-45 25Z"
            fill="#342A31"
          />
          <circle cx="96" cy="96" r="3" fill="#382B2C" />
          <circle cx="124" cy="96" r="3" fill="#382B2C" />
          <path d="M102 116c5 5 11 5 16 0-2 8-14 8-16 0Z" fill="#965B50" />
        </>
      ) : (
        <>
          <path
            d="M76 84c-4-33 10-53 34-54 25-1 40 17 36 50l-10-7c-8-5-14-11-18-20-10 12-23 19-42 22Z"
            fill="#344555"
          />
          <path
            d="M78 83c1-23 12-35 32-35s32 13 32 36v13c0 21-13 37-32 37S78 118 78 97V83Z"
            fill="#E4B18E"
          />
          <path
            d="M78 82c-2-20 5-38 19-48 14-10 32-8 44 3-11-2-19 2-24 10-8-4-17-1-23 7-6 8-9 18-16 28Z"
            fill="#344555"
          />
          <path d="M93 96c2-2 5-2 7 0m20 0c2-2 5-2 7 0" fill="none" stroke="#4A3833" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="97" cy="99" r="2.4" fill="#302B2D" />
          <circle cx="123" cy="99" r="2.4" fill="#302B2D" />
          <path d="M102 119c5 4 11 4 16 0-2 7-14 7-16 0Z" fill="#895846" />
        </>
      )}
    </svg>
  );
}
