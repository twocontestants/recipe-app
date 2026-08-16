# Contract: picker viewport box

Pure function used by the planner picker overlay.

```ts
export type ViewportRect = {
  offsetTop: number;
  offsetLeft: number;
  width: number;
  height: number;
};

export type LayoutRect = {
  innerWidth: number;
  innerHeight: number;
};

export type PickerSheetBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  keyboardOpen: boolean;
};

export const KEYBOARD_OVERLAY_MIN_PX = 150;
export const KEYBOARD_OPEN_DELTA_PX = 200;

export function computePickerSheetBox(
  visual: ViewportRect,
  layout: LayoutRect,
  baselineVisualHeight: number,
  baselineInnerHeight?: number,
): PickerSheetBox;
```

`baselineInnerHeight` defaults to `baselineVisualHeight`. Callers pass the visual height and `window.innerHeight` captured when the picker opened (before body scroll lock).

## Invariants

1. `top === visual.offsetTop` and `left === visual.offsetLeft` and `width === visual.width`.
2. Let `toLayoutBottom = max(0, layout.innerHeight - top)` and `toBaselineBottom = max(0, (baselineInnerHeight ?? baselineVisualHeight) - top)`.
3. Overlaying keyboard: visual shrank by `>= KEYBOARD_OPEN_DELTA_PX` from `baselineVisualHeight` **and** space below the visual viewport (`toLayoutBottom - visual.height`) is `>= KEYBOARD_OVERLAY_MIN_PX`. Then `height === visual.height`.
4. Layout-excludes-keyboard: layout inner height shrank by `>= KEYBOARD_OPEN_DELTA_PX` from `baselineInnerHeight`. Then `height === toLayoutBottom` (fill leftover chrome strip, do not grow back under the keys).
5. Otherwise (keyboard closed / chrome / body-lock gap): `height === max(toLayoutBottom, toBaselineBottom)` so the **sheet** fills leftover space rather than a dimmer hiding it.
6. `keyboardOpen` is true in cases 3 or 4.
7. `top + height` never exceeds `max(layout.innerHeight, baselineInnerHeight ?? baselineVisualHeight)`.
8. `height` is never negative.
