import {dawnColors} from './dawnPalette';
import {sageColors} from './theme';
// Keep the supplied scene artwork; use the shared light theme for forms.
export const dawnUiColors={...dawnColors,
 bg:sageColors.bg,panel:sageColors.surface,option:sageColors.divider,
 border:sageColors.border,text:sageColors.text,muted:sageColors.muted,
 accent:sageColors.green,mint:sageColors.green,disabled:sageColors.muted,
 error:sageColors.danger,onAccent:sageColors.onAccent,
} as const;
