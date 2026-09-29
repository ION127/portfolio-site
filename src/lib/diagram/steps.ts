/** 문단 top 좌표 중 기준선보다 위(작은 값)에 있는 마지막 인덱스. 없으면 0. */
export function activeStepIndex(tops: number[], line: number): number {
  let index = 0;
  for (let i = 0; i < tops.length; i += 1) {
    if (tops[i] < line) index = i;
  }
  return index;
}

/** 좌우 배치: 뷰포트 높이의 55%. 상하 배치: 고정된 다이어그램 아래 남은 영역의 35% 지점. */
export function activationLine(viewportH: number, stacked: boolean, figureBottom = 0): number {
  if (!stacked) return viewportH * 0.55;
  const top = Math.max(0, figureBottom);
  return top + (viewportH - top) * 0.35;
}
