import React, { Component } from 'react';

interface ProductPitchProps {
  darkMode: boolean;
}

class ProductPitch extends Component<ProductPitchProps> {
  public render(): React.JSX.Element {
    const { darkMode } = this.props;

    return (
      <div className="flex items-center justify-center min-h-[60vh] py-8 px-4">
        <section
          role="region"
          data-testid="product-pitch-section"
          className={`product-pitch-panel rounded-xl w-full max-w-[min(42rem,100%)] min-h-[min(26rem,60vh)] px-6 py-8 sm:px-10 md:px-12 ${darkMode ? 'product-pitch-panel--dark' : 'product-pitch-panel--light'}`}
        >
          <div className="max-w-3xl mx-auto">
            <h2
              className={`product-pitch-heading text-xl sm:text-2xl font-bold mb-5 ${darkMode ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-primary-dark)]'}`}
            >
              About Us
            </h2>
            <p
              className={`text-sm sm:text-base leading-relaxed ${darkMode ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-secondary)]'}`}
              style={{ lineHeight: '1.8' }}
            >
              What if you could easily track how housing and employment growth are shaping the future of Hamilton and Toronto—all in one place?
              Regional planners, real estate investors, and policymakers often struggle with fragmented data, making informed decisions difficult.
              The Metropolitan Housing and Employment Growth Index simplifies this by integrating housing statistics and employment trends into an
              intuitive platform with Line Charts and Radar Charts, enabling quick comparisons and insights. Imagine a city planner aligning development
              plans with real-time data—saving time and ensuring balanced growth. By transforming complex data into clear visuals, our tool boosts productivity,
              supports data-driven decisions, and maximizes ROI.
            </p>
          </div>
        </section>
      </div>
    );
  }
}

export default ProductPitch;
