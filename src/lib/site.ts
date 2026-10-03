export const SITE = {
  author: { ko: '신중훈', en: 'Shin JoongHoon' },
  githubUrl: 'https://github.com/ION127',
} as const;

// 상세 페이지 섹션 순서. 목차(Toc)와 ProjectPage가 같은 목록을 쓴다.
export const PROJECT_SECTIONS = [
  'overview',
  'architecture',
  'demo',
  'ops',
  'decisions',
  'infra',
  'contribution',
  'retrospective',
] as const;
export type ProjectSectionId = (typeof PROJECT_SECTIONS)[number];

export const PROJECT_SLUGS = ['baro', 'stockpulse'] as const;
export type ProjectSlug = (typeof PROJECT_SLUGS)[number];
