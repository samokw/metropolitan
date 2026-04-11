import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductPitch from '../../components/ProductPitch';

describe('ProductPitch Component', () => {
  describe('Light Mode', () => {
    beforeEach(() => {
      render(<ProductPitch darkMode={false} />);
    });

    it('renders with light panel class', () => {
      const section = screen.getByTestId('product-pitch-section');
      expect(section).toHaveClass('product-pitch-panel--light');
    });

    it('renders the "About Us" heading with light theme text class', () => {
      const heading = screen.getByRole('heading', { name: /About Us/i });
      expect(heading).toHaveClass('text-[var(--color-primary-dark)]');
    });

    it('renders the description with secondary text class', () => {
      const description = screen.getByText(/What if you could easily track/i);
      expect(description).toHaveClass('text-[var(--color-text-secondary)]');
    });
  });

  describe('Dark Mode', () => {
    beforeEach(() => {
      render(<ProductPitch darkMode={true} />);
    });

    it('renders with dark panel class', () => {
      const section = screen.getByTestId('product-pitch-section');
      expect(section).toHaveClass('product-pitch-panel--dark');
      expect(section).not.toHaveClass('product-pitch-panel--light');
    });

    it('renders the "About Us" heading with dark theme text class', () => {
      const heading = screen.getByRole('heading', { name: /About Us/i });
      expect(heading).toHaveClass('text-[var(--color-text-primary)]');
    });

    it('renders the description with secondary text class', () => {
      const description = screen.getByText(/What if you could easily track/i);
      expect(description).toHaveClass('text-[var(--color-text-secondary)]');
    });
  });
});
