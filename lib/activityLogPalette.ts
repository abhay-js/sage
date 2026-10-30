import {sageColors} from './theme';
/** Shared V2 colours, with sport-specific accents. */
export const activityLogColors = {
  ...sageColors,tabs: '#E6EDF1',tag:sageColors.pale,bar:'#6FA38B',barPast:'#C9D8D1',
  avatar:sageColors.peach,overlay:'#0F1B2480',
  sports: {
    run: {bg: '#FFE3D6', ink: '#B23A12'}, ride: {bg: '#DCE7FF', ink: '#2848A8'},
    swim: {bg: '#D4F3EC', ink: '#11705C'}, lift: {bg: '#E9DFFF', ink: '#5A33B8'},
    walk: {bg: '#E8EDF0', ink: '#3E4D57'}, other: {bg: '#E8EDF0', ink: '#3E4D57'},
  },
} as const;
