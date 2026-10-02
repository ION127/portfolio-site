const sign = (n: number, digits: number) => (Number(n.toFixed(digits)) > 0 ? '+' : Number(n.toFixed(digits)) < 0 ? '−' : '');

/** 부호를 붙인 소수 한 자리. 음수는 하이픈이 아니라 마이너스 기호(U+2212)를 쓴다. */
export const formatSigned = (n: number, digits = 1): string => `${sign(n, digits)}${Math.abs(n).toFixed(digits)}`;

/** 등락률 표기: +3.4%, −4.3%, 0.0% */
export const formatPct = (r: number): string => `${formatSigned(r)}%`;
