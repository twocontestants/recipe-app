import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PickerSearchField, { pickerSearchFieldCss } from './PickerSearchField';

describe('PickerSearchField', () => {
  it('does not use a native search input that draws its own icon over text', () => {
    render(<PickerSearchField value="pasta" onChange={() => {}} />);
    const input = screen.getByPlaceholderText('Search recipes…');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveProperty('type', 'text');
    expect(input.getAttribute('type')).not.toBe('search');
  });

  it('places the magnifying glass as a flex sibling, not absolutely over the input', () => {
    const { container } = render(<PickerSearchField value="p" onChange={() => {}} />);
    const field = container.querySelector('.pl-picker-search-field');
    const icon = container.querySelector('.pl-picker-search-icon');
    const input = container.querySelector('.pl-picker-search');
    expect(field).toBeTruthy();
    expect(icon).toBeTruthy();
    expect(input).toBeTruthy();
    expect(icon?.nextElementSibling).toBe(input);
    expect(field?.getAttribute('data-layout')).toBe('cluster');
    expect(pickerSearchFieldCss).toMatch(/\.pl-picker-search-field\s*\{[^}]*display:\s*flex/);
    expect(pickerSearchFieldCss).toMatch(/\.pl-picker-search-icon\s*\{[^}]*position:\s*static/);
    expect(pickerSearchFieldCss).not.toMatch(/\.pl-picker-search-icon\s*\{[^}]*position:\s*absolute/);
  });
});
