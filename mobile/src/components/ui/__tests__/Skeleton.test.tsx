/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Skeleton, SkeletonText, SkeletonCard } from '../Skeleton';

describe('Skeleton', () => {
  describe('basic rendering', () => {
    it('renders with default props', () => {
      const { toJSON } = render(<Skeleton />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with custom width and height', () => {
      const { toJSON } = render(<Skeleton width={200} height={20} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with percentage width', () => {
      const { toJSON } = render(<Skeleton width="50%" height={16} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('circle mode', () => {
    it('renders as circle when circle prop is true', () => {
      const { toJSON } = render(<Skeleton circle width={40} height={40} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('custom border radius', () => {
    it('applies custom border radius', () => {
      const { toJSON } = render(<Skeleton borderRadius={12} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('custom style', () => {
    it('applies custom style', () => {
      const { toJSON } = render(
        <Skeleton style={{ backgroundColor: 'red' }} />
      );
      expect(toJSON()).toBeTruthy();
    });
  });
});

describe('SkeletonText', () => {
  describe('basic rendering', () => {
    it('renders default 3 lines', () => {
      const { toJSON } = render(<SkeletonText />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders custom number of lines', () => {
      const { toJSON } = render(<SkeletonText lines={5} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('last line width', () => {
    it('renders with custom last line width', () => {
      const { toJSON } = render(<SkeletonText lastLineWidth="40%" />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('custom gap', () => {
    it('renders with custom gap', () => {
      const { toJSON } = render(<SkeletonText gap={12} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('custom line height', () => {
    it('renders with custom line height', () => {
      const { toJSON } = render(<SkeletonText lineHeight={20} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});

describe('SkeletonCard', () => {
  describe('basic rendering', () => {
    it('renders with default props', () => {
      const { toJSON } = render(<SkeletonCard />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('avatar option', () => {
    it('renders with avatar', () => {
      const { toJSON } = render(<SkeletonCard hasAvatar />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders without avatar', () => {
      const { toJSON } = render(<SkeletonCard hasAvatar={false} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('text lines', () => {
    it('renders with custom text lines', () => {
      const { toJSON } = render(<SkeletonCard textLines={4} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('custom height', () => {
    it('renders with custom height', () => {
      const { toJSON } = render(<SkeletonCard height={200} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
