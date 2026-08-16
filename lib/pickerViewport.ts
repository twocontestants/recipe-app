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

/** Visual/layout shrink that is large enough to be a keyboard, not a URL bar. */
export const KEYBOARD_OPEN_DELTA_PX = 200;
/** Hole below the visual viewport that indicates an overlaying keyboard. */
export const KEYBOARD_OVERLAY_MIN_PX = 150;

export function computePickerSheetBox(
  visual: ViewportRect,
  layout: LayoutRect,
  baselineVisualHeight: number,
  baselineInnerHeight: number = baselineVisualHeight,
): PickerSheetBox {
  const top = visual.offsetTop;
  const left = visual.offsetLeft;
  const width = visual.width;
  const toLayoutBottom = Math.max(0, layout.innerHeight - top);
  const toBaselineBottom = Math.max(0, baselineInnerHeight - top);
  const spaceBelow = toLayoutBottom - visual.height;
  const visualShrunkBy = baselineVisualHeight - visual.height;
  const layoutShrunkBy = baselineInnerHeight - layout.innerHeight;

  const overlayingKeyboard =
    visualShrunkBy >= KEYBOARD_OPEN_DELTA_PX && spaceBelow >= KEYBOARD_OVERLAY_MIN_PX;
  const layoutExcludesKeyboard = layoutShrunkBy >= KEYBOARD_OPEN_DELTA_PX;
  const keyboardOpen = overlayingKeyboard || layoutExcludesKeyboard;

  // Fill leftover chrome / body-lock / URL-bar space with the sheet itself.
  // Only stay on the visual viewport when a keyboard is overlaying it; otherwise
  // the list would stay short and the gap would show the planner through.
  let height: number;
  if (overlayingKeyboard) {
    height = visual.height;
  } else if (layoutExcludesKeyboard) {
    height = toLayoutBottom;
  } else {
    height = Math.max(toLayoutBottom, toBaselineBottom);
  }

  const maxHeight = Math.max(toLayoutBottom, toBaselineBottom);
  height = Math.min(Math.max(0, height), maxHeight);

  return { top, left, width, height, keyboardOpen };
}
