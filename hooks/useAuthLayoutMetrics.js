import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * Вёрстка экранов Welcome/Login/Register: на узких телефонах (например iPhone 12 mini, 375×812)
 * уменьшаем шрифты и ширину контента. Вертикальное положение задаёт AuthScreenChrome (центр +
 * SafeArea), здесь только отступы.
 */
export function useAuthLayoutMetrics() {
  const { width: w, height: h } = useWindowDimensions();

  return useMemo(() => {
    const narrow = w < 420;
    const compact = w < 400;
    const tiny = w < 360;
    const tight = narrow || h < 750;
    const padX = tiny ? 10 : compact ? 12 : 16;
    const maxContentWidth = Math.max(260, Math.min(340, Math.floor(w - padX * 2)));

    if (tight) {
      return {
        form: {
          inputFontSize: tiny ? 17 : compact ? 18 : 19,
          inputPadV: tiny ? 11 : compact ? 12 : 13,
          inputPadH: tiny ? 16 : compact ? 20 : 22,
          inputMarginB: tiny ? 10 : compact ? 12 : 11,
          btnFontSize: tiny ? 18 : compact ? 20 : 22,
          btnPadV: tiny ? 12 : compact ? 14 : 16,
          btnMarginB: tiny ? 8 : compact ? 10 : 12,
          btnMarginT: tiny ? 4 : compact ? 6 : 8,
          linkFontSize: tiny ? 16 : compact ? 18 : 20,
          mutedLinkFontSize: tiny ? 16 : 18,
          maxContentWidth,
          padX,
        },
        chrome: {
          titleSize: tiny ? 38 : compact ? 42 : narrow ? 52 : 46,
          titleLineHeight: tiny ? 38 : compact ? 42 : narrow ? 58 : 48,
          subtitleSize: tiny ? 15 : compact ? 16 : 18,
          subtitleMarginBottom: compact ? 10 : 12,
          mascotPct: tiny ? '20%' : compact ? '22%' : narrow ? '28%' : '26%',
          mascotMarginBottom: compact ? 12 : 16,
          scrollPaddingTop: compact ? 8 : 12,
          scrollPaddingBottom: compact ? 16 : 20,
          containerPaddingVertical: compact ? 8 : 12,
        },
      };
    }

    return {
      form: {
        inputFontSize: h < 700 ? 20 : 26,
        inputPadV: h < 700 ? 12 : 18,
        inputPadH: h < 700 ? 20 : 24,
        inputMarginB: h < 700 ? 12 : 20,
        btnFontSize: h < 700 ? 20 : 28,
        btnPadV: h < 700 ? 14 : 20,
        btnMarginB: h < 700 ? 10 : 16,
        btnMarginT: h < 700 ? 4 : 8,
        linkFontSize: h < 700 ? 16 : 22,
        mutedLinkFontSize: 16,
        maxContentWidth,
        padX: 16,
      },
      chrome: {
        titleSize: h < 700 ? 46 : 64,
        titleLineHeight: h < 700 ? 40 : 70,
        subtitleSize: 18,
        subtitleMarginBottom: 16,
        mascotPct: h < 700 ? '20%' : '30%',
        mascotMarginBottom: 20,
        scrollPaddingTop: 0,
        scrollPaddingBottom: 8,
        containerPaddingVertical: 16,
      },
    };
  }, [w, h]);
}
