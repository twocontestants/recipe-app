import { describe, expect, it } from 'vitest';
import {
  KEYBOARD_OPEN_DELTA_PX,
  KEYBOARD_OVERLAY_MIN_PX,
  computePickerSheetBox,
} from './pickerViewport';

const baseline = 700;

describe('computePickerSheetBox', () => {
  it('keeps the sheet on the visual viewport when a keyboard overlays the layout', () => {
    const box = computePickerSheetBox(
      { offsetTop: 0, offsetLeft: 0, width: 390, height: 400 },
      { innerWidth: 390, innerHeight: 700 },
      baseline,
    );
    expect(box).toEqual({
      top: 0,
      left: 0,
      width: 390,
      height: 400,
      keyboardOpen: true,
    });
    expect(700 - 400).toBeGreaterThanOrEqual(KEYBOARD_OVERLAY_MIN_PX);
    expect(box.top + box.height).toBeLessThanOrEqual(700);
  });

  it('fills a small chrome gap when the layout viewport already excludes the keyboard', () => {
    const box = computePickerSheetBox(
      { offsetTop: 0, offsetLeft: 0, width: 390, height: 400 },
      { innerWidth: 390, innerHeight: 450 },
      baseline,
    );
    expect(box.height).toBe(450);
    expect(box.keyboardOpen).toBe(true);
    expect(box.top + box.height).toBe(450);
    expect(450 - 400).toBeLessThan(KEYBOARD_OVERLAY_MIN_PX);
  });

  it('does not shrink the sheet when there is no keyboard', () => {
    const box = computePickerSheetBox(
      { offsetTop: 0, offsetLeft: 0, width: 1024, height: 700 },
      { innerWidth: 1024, innerHeight: 700 },
      baseline,
    );
    expect(box.height).toBe(700);
    expect(box.keyboardOpen).toBe(false);
    expect(baseline - box.height).toBeLessThan(KEYBOARD_OPEN_DELTA_PX);
  });

  it('honours visual viewport pan while a keyboard is open', () => {
    const box = computePickerSheetBox(
      { offsetTop: 80, offsetLeft: 0, width: 390, height: 400 },
      { innerWidth: 390, innerHeight: 700 },
      baseline,
    );
    expect(box.top).toBe(80);
    expect(box.height).toBe(400);
    expect(box.keyboardOpen).toBe(true);
    expect(box.top + box.height).toBeLessThanOrEqual(700);
  });

  it('never lets the sheet extend past the layout viewport', () => {
    const box = computePickerSheetBox(
      { offsetTop: 600, offsetLeft: 0, width: 390, height: 400 },
      { innerWidth: 390, innerHeight: 700 },
      baseline,
    );
    expect(box.top + box.height).toBeLessThanOrEqual(700);
    expect(box.height).toBeGreaterThan(0);
  });
});
