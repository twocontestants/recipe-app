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
): PickerSheetBox {
  const top = visual.offsetTop;
  const left = visual.offsetLeft;
  const width = visual.width;
  const spaceBelow = layout.innerHeight - visual.offsetTop - visual.height;

  let height = visual.height;
  if (spaceBelow > 0 && spaceBelow < KEYBOARD_OVERLAY_MIN_PX) {
    height = layout.innerHeight - visual.offsetTop;
  }

  const maxHeight = Math.max(0, layout.innerHeight - top);
  height = Math.min(height, maxHeight);

  const keyboardOpen =
    baselineHeight - height >= KEYBOARD_OPEN_DELTA_PX ||
    baselineHeight - visual.height >= KEYBOARD_OPEN_DELTA_PX;

  return { top, left, width, height, keyboardOpen };
}
