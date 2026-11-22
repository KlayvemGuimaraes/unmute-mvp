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
  const id = isClara ? 'clara' : 'miguel';
  const label = isClara ? 'Clara' : 'Miguel';

  return (
    <svg
      aria-label={'Ilustração de ' + label}
      className={className}
      role="img"
      viewBox="0 0 220 220"
      fill="none"
    >
      <defs>
        <linearGradient id={'ouvira-bg-' + id} x1="22" y1="12" x2="197" y2="210" gradientUnits="userSpaceOnUse">
          <stop stopColor={isClara ? '#EAF8F6' : '#EDF6FC'} />
          <stop offset="1" stopColor={isClara ? '#CFECE8' : '#D8EAF7'} />
        </linearGradient>
        <linearGradient id={'ouvira-skin-' + id} x1="78" y1="55" x2="146" y2="151" gradientUnits="userSpaceOnUse">
          <stop stopColor={isClara ? '#F2C6A7' : '#E8B592'} />
          <stop offset="1" stopColor={isClara ? '#C77E62' : '#B87558'} />
        </linearGradient>
        <linearGradient id={'ouvira-hair-' + id} x1="65" y1="22" x2="155" y2="164" gradientUnits="userSpaceOnUse">
          <stop stopColor={isClara ? '#554047' : '#4A5B6C'} />
          <stop offset=".5" stopColor={isClara ? '#30242B' : '#263342'} />
          <stop offset="1" stopColor={isClara ? '#241D24' : '#182432'} />
        </linearGradient>
        <linearGradient id={'ouvira-outfit-' + id} x1="44" y1="165" x2="177" y2="225" gradientUnits="userSpaceOnUse">
          <stop stopColor={isClara ? '#178C8E' : '#2B76A7'} />
          <stop offset="1" stopColor={isClara ? '#0E6575' : '#174A76'} />
        </linearGradient>
        <radialGradient id={'ouvira-glow-' + id} cx="0" cy="0" r="1" gradientTransform="matrix(118 125 -125 118 42 24)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity=".9" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <clipPath id={'ouvira-clip-' + id}>
          <rect x="5" y="5" width="210" height="210" rx="66" />
        </clipPath>
      </defs>

      <g clipPath={'url(#ouvira-clip-' + id + ')'}>
        <rect x="5" y="5" width="210" height="210" rx="66" fill={'url(#ouvira-bg-' + id + ')'} />
        <circle cx="43" cy="28" r="85" fill={'url(#ouvira-glow-' + id + ')'} />
        <path
          d="M6 172c36-28 71-28 104-10 39 21 70 16 105-10v72H6v-52Z"
          fill={isClara ? '#B9E4DF' : '#C2DDEE'}
          fillOpacity=".62"
        />
        <circle cx="181" cy="41" r="19" fill="#FFFFFF" fillOpacity=".44" />
        <circle cx="181" cy="41" r="10" stroke="#FFFFFF" strokeOpacity=".8" />

        {isClara ? (
          <g>
            <path d="M53 99c-3-42 18-68 58-68 39 0 60 27 57 68l-6 46c-3 25-19 42-51 42-30 0-48-18-51-44l-7-44Z" fill={'url(#ouvira-hair-' + id + ')'} />
            <path d="M27 222c6-36 27-59 61-66l23 26 23-26c34 7 55 30 61 66H27Z" fill={'url(#ouvira-outfit-' + id + ')'} />
            <path d="M91 143h38v35l-19 19-19-19v-35Z" fill={'url(#ouvira-skin-' + id + ')'} />
            <path d="M87 158 110 183l23-25c11 3 20 8 28 15l-17 49H76l-17-49c8-7 17-12 28-15Z" fill="#F8FCFC" />
            <path d="m87 162 23 27 23-27 10 7-19 43H96l-19-43 10-7Z" fill="#D9F0ED" />
            <path d="M73 69c0-21 14-36 39-36 25 0 39 16 39 37v39c0 27-16 45-39 45-23 0-39-18-39-45V69Z" fill={'url(#ouvira-skin-' + id + ')'} />
            <path d="M70 96c-11-16-10-46 8-62 12-11 28-15 46-11 24 7 37 30 31 60-11-5-18-14-22-28-16 16-39 23-64 22l1 19Z" fill={'url(#ouvira-hair-' + id + ')'} />
            <path d="M76 98c-8 19-6 44 2 61l-12 7c-13-21-15-49-4-69l14 1Zm67-7c10 21 7 48-4 66l12 8c16-24 16-57 1-78l-9 4Z" fill={'url(#ouvira-hair-' + id + ')'} />
            <path d="M80 84c8-7 16-10 25-10m16-1c9 1 16 5 22 11" stroke="#8A6259" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
            <path d="M84 98c5-4 12-4 17 0m17 0c5-4 12-4 17 0" stroke="#573B3B" strokeWidth="2.8" strokeLinecap="round" />
            <ellipse cx="93" cy="104" rx="2.7" ry="3.1" fill="#352A2D" />
            <ellipse cx="127" cy="104" rx="2.7" ry="3.1" fill="#352A2D" />
            <circle cx="94" cy="103" r=".85" fill="#FFFFFF" />
            <circle cx="128" cy="103" r=".85" fill="#FFFFFF" />
            <path d="M110 106c-1 8-4 13-2 16 1 2 4 2 7 1" stroke="#B56D5A" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" />
            <path d="M101 132c6 5 14 5 20 0" stroke="#97594D" strokeWidth="2.8" strokeLinecap="round" />
            <ellipse cx="84" cy="119" rx="7" ry="3.5" fill="#D47E75" fillOpacity=".2" />
            <ellipse cx="138" cy="119" rx="7" ry="3.5" fill="#D47E75" fillOpacity=".2" />
            <circle cx="72" cy="134" r="3" fill="#D8AA5B" />
            <circle cx="151" cy="134" r="3" fill="#D8AA5B" />
          </g>
        ) : (
          <g>
            <path d="M53 93c0-39 20-63 58-63s58 25 57 64l-5 45c-3 24-19 40-52 40-31 0-48-17-51-42l-7-44Z" fill={'url(#ouvira-hair-' + id + ')'} />
            <path d="M27 222c6-35 29-59 62-66l22 26 21-26c34 7 55 31 61 66H27Z" fill={'url(#ouvira-outfit-' + id + ')'} />
            <path d="M92 143h38v34l-19 19-19-19v-34Z" fill={'url(#ouvira-skin-' + id + ')'} />
            <path d="m88 158 23 25 23-25c10 3 19 8 27 15l-17 49H73l-17-49c8-7 18-12 32-15Z" fill="#E8F3F8" />
            <path d="m88 160 23 28 23-28 11 7-20 50h-28l-20-50 11-7Z" fill="#FFFFFF" />
            <path d="M73 67c1-21 17-36 39-36 25 0 41 16 39 43l-2 35c-2 28-17 47-39 47-24 0-39-19-39-47l2-42Z" fill={'url(#ouvira-skin-' + id + ')'} />
            <path d="M71 82c-8-17-6-38 8-52 11-11 25-15 42-12 18 2 31 14 36 31-13-1-23-7-30-17-11 10-27 16-49 17l-7 33Z" fill={'url(#ouvira-hair-' + id + ')'} />
            <path d="M82 135c7 10 17 15 29 15 11 0 21-5 28-15-5 19-15 28-28 28-14 0-24-9-29-28Z" fill="#70483F" fillOpacity=".58" />
            <path d="M82 98c5-4 12-4 17 0m18 0c5-4 12-4 17 0" stroke="#3B3538" strokeWidth="2.8" strokeLinecap="round" />
            <ellipse cx="91" cy="104" rx="2.7" ry="3.1" fill="#302B30" />
            <ellipse cx="126" cy="104" rx="2.7" ry="3.1" fill="#302B30" />
            <circle cx="92" cy="103" r=".85" fill="#FFFFFF" />
            <circle cx="127" cy="103" r=".85" fill="#FFFFFF" />
            <path d="M109 106c0 8-3 13-1 16 1 2 4 2 7 1" stroke="#A86652" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" />
            <path d="M100 132c6 4 14 4 20 0" stroke="#805043" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M74 61c4-8 11-13 20-16m17-4c11 0 19 4 25 12" stroke="#8291A1" strokeOpacity=".42" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        <path d="M21 202c20 8 39 10 57 7" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
      </g>
      <rect x="5.5" y="5.5" width="209" height="209" rx="65.5" stroke="#FFFFFF" strokeOpacity=".9" />
      <rect x="6" y="6" width="208" height="208" rx="65" stroke="#0B5D8B" strokeOpacity=".13" />
    </svg>
  );
}
