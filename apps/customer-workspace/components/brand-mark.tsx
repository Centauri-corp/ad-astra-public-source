export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width={small ? 26 : 38}
      height={small ? 26 : 38}
      viewBox="0 0 64 64"
      fill="none"
    >
      <path
        d="M49.2 15.4A25.4 25.4 0 1 0 54 37.1"
        stroke="#9BDFE3"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M13.5 48.8c7.2-10.2 19.1-20 36.1-31"
        stroke="#E9C990"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M32 8.2v8.2M32 47.6v8.2M8.2 32h8.2M47.6 32h8.2"
        stroke="#214B78"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="5.1" fill="#EDF3F3" />
      <circle cx="32" cy="32" r="2.1" fill="#9BDFE3" />
    </svg>
  );
}
