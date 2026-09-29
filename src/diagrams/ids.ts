// 콘텐츠 스키마가 가져다 쓰는 id 목록. 데이터 파일을 끌고 오지 않도록 따로 둔다.
export const DIAGRAM_IDS = ['baro', 'stockpulse'] as const;
export type DiagramId = (typeof DIAGRAM_IDS)[number];

export const MINI_SCENE_IDS = ['baro-telemetry', 'stockpulse-anomaly', 'baro-cicd', 'stockpulse-gitops'] as const;
export type MiniSceneId = (typeof MINI_SCENE_IDS)[number];
