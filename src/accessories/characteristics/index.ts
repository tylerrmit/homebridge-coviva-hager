export * from './active';
export * from './brightness';
export * from './on';
export * from './currentposition';
export * from './targetposition';
export * from './positionstate';

export const COLOR_MODES = ['color', 'colour'] as const;
export type ColorModes = typeof COLOR_MODES[number] | 'white';

