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
export const KEYBOARD_OPEN_DELTA_PX = 120;

export function computePickerSheetBox(
  visual: ViewportRect,
  layout: LayoutRect,
  baselineHeight: number,
): PickerSheetBox;
```

## Invariants

1. `top === visual.offsetTop` and `left === visual.offsetLeft` and `width === visual.width`.
2. If `layout.innerHeight - visual.offsetTop - visual.height` is in `(0, KEYBOARD_OVERLAY_MIN_PX)`, then `height === layout.innerHeight - visual.offsetTop` (no uncovered strip).
3. If that space is `>= KEYBOARD_OVERLAY_MIN_PX`, then `height === visual.height` (do not draw under the keyboard).
4. `keyboardOpen === baselineHeight - height >= KEYBOARD_OPEN_DELTA_PX` OR `baselineHeight - visual.height >= KEYBOARD_OPEN_DELTA_PX`.
5. `top + height` never exceeds `layout.innerHeight`.
6. `height` is never less than `visual.height`.
