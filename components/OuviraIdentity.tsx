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
  const hair = isClara ? '#332A32' : '#282F39';
  const shirt = isClara ? '#168D91' : '#246EAA';
  const label = isClara ? 'Clara' : 'Miguel';

  return (
    <svg
      aria-label={'Retrato de ' + label}
      className={className}
      role="img"
      viewBox="0 0 160 160"
      fill="none"
    >
      <defs>
        <linearGradient id={'avatar-bg-' + id} x1="24" y1="6" x2="140" y2="156" gradientUnits="userSpaceOnUse">
          <stop stopColor={isClara ? '#E6F6F4' : '#E8F3FB'} />
          <stop offset="1" stopColor={isClara ? '#D8EFEC' : '#D7EAF7'} />
        </linearGradient>
        <linearGradient id={'avatar-skin-' + id} x1="58" y1="42" x2="105" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD8BD" />
          <stop offset="1" stopColor="#C98069" />
        </linearGradient>
        <linearGradient id={'avatar-shirt-' + id} x1="45" y1="109" x2="121" y2="161" gradientUnits="userSpaceOnUse">
          <stop stopColor={shirt} />
          <stop offset="1" stopColor={isClara ? '#116E75' : '#174F83'} />
        </linearGradient>
        <radialGradient id={'avatar-glow-' + id} cx="0" cy="0" r="1" gradientTransform="matrix(70 81 -81 70 44 29)" gradientUnits="userSpaceOnUse">
          <stop stopColor={isClara ? '#55BFB7' : '#5AA6D7'} stopOpacity=".22" />
          <stop offset="1" stopColor={isClara ? '#55BFB7' : '#5AA6D7'} stopOpacity="0" />
        </radialGradient>
        <clipPath id={'avatar-clip-' + id}>
          <circle cx="80" cy="80" r="78" />
        </clipPath>
      </defs>
      <g clipPath={'url(#avatar-clip-' + id + ')'}>
        <circle cx="80" cy="80" r="78" fill={'url(#avatar-bg-' + id + ')'} />
        <circle cx="80" cy="80" r="78" fill={'url(#avatar-glow-' + id + ')'} />
        <circle cx="80" cy="80" r="67" stroke="#1268B3" strokeOpacity=".10" />
        <circle cx="80" cy="80" r="55" stroke="#1268B3" strokeOpacity=".07" />
        <path d="M27 153c6-29 25-45 53-45 29 0 48 16 54 45v12H27v-12Z" fill={'url(#avatar-shirt-' + id + ')'} />
        <path d="m62 107 18 21 18-21-8-11H70l-8 11Z" fill="#CF8E78" />
        <path d="M53 64c0-23 11-37 27-37 18 0 28 15 28 38v14c0 21-12 35-28 35S53 100 53 79V64Z" fill={'url(#avatar-skin-' + id + ')'} />
        {isClara ? (
          <>
            <path d="M51 76c-8-23 0-52 28-52 26 0 37 21 30 48-5-5-9-14-10-25-12 9-27 14-47 14l-1 15Z" fill={hair} />
            <path d="M52 70c-7 14-6 39 2 55l-13 7c-12-20-13-46 0-64l11 2Zm55-15c11 18 9 47-2 66l13 8c15-24 15-57-1-78l-10 4Z" fill={hair} />
            <path d="M61 34c8-9 18-13 29-9 6 2 11 7 14 13-15-6-28-5-43 0Z" fill={hair} />
          </>
        ) : (
          <>
            <path d="M52 69c-6-22 5-46 29-46 26 0 35 21 29 45-6-7-9-15-10-25-11 8-27 12-47 12v14l-1 0Z" fill={hair} />
            <path d="M64 95c4 7 9 10 16 10s12-3 16-10c-3 12-9 17-16 17s-13-5-16-17Z" fill="#9A5F51" />
          </>
        )}
        <ellipse cx="68" cy="74" rx="2.4" ry="3" fill="#342B33" />
        <ellipse cx="93" cy="74" rx="2.4" ry="3" fill="#342B33" />
        <path d="M73 90c4 3 10 3 14 0" stroke="#99594B" strokeLinecap="round" strokeWidth="2.2" />
        <path d="M80 77v7" stroke="#B97562" strokeLinecap="round" strokeWidth="1.8" />
        <circle cx="125" cy="31" r="2" fill={shirt} />
        <circle cx="34" cy="102" r="1.5" fill="white" fillOpacity=".75" />
      </g>
      <circle cx="80" cy="80" r="77" stroke="#1268B3" strokeOpacity=".14" strokeWidth="2" />
    </svg>
  );
}
