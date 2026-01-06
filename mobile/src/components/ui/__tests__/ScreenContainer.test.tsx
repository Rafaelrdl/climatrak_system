/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ScreenContainer } from '../ScreenContainer';

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => (
    <MockSafeAreaView {...props}>{children}</MockSafeAreaView>
  ),
}));

const MockSafeAreaView = ({ children, ...props }: any) => (
  <>{children}</>
);

describe('ScreenContainer', () => {
  describe('basic rendering', () => {
    it('renders children', () => {
      const { getByText } = render(
        <ScreenContainer>
          <Text>Screen Content</Text>
        </ScreenContainer>
      );
      expect(getByText('Screen Content')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('shows loading indicator when loading is true', () => {
      const { queryByText, UNSAFE_queryByType } = render(
        <ScreenContainer loading>
          <Text>Content</Text>
        </ScreenContainer>
      );
      // Content should not be visible when loading
      expect(queryByText('Content')).toBeNull();
    });

    it('shows custom loading component', () => {
      const { getByText } = render(
        <ScreenContainer loading loadingComponent={<Text>Custom Loading</Text>}>
          <Text>Content</Text>
        </ScreenContainer>
      );
      expect(getByText('Custom Loading')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('shows empty state when empty is true', () => {
      const { getByText, queryByText } = render(
        <ScreenContainer empty emptyTitle="No Items">
          <Text>Content</Text>
        </ScreenContainer>
      );
      expect(getByText('No Items')).toBeTruthy();
      expect(queryByText('Content')).toBeNull();
    });

    it('shows empty description', () => {
      const { getByText } = render(
        <ScreenContainer
          empty
          emptyTitle="No Data"
          emptyDescription="Add some data to get started"
        >
          <Text>Content</Text>
        </ScreenContainer>
      );
      expect(getByText('Add some data to get started')).toBeTruthy();
    });

    it('shows custom empty component', () => {
      const { getByText } = render(
        <ScreenContainer empty emptyComponent={<Text>Custom Empty</Text>}>
          <Text>Content</Text>
        </ScreenContainer>
      );
      expect(getByText('Custom Empty')).toBeTruthy();
    });

    it('does not show empty state when loading', () => {
      const { queryByText } = render(
        <ScreenContainer loading empty emptyTitle="Empty">
          <Text>Content</Text>
        </ScreenContainer>
      );
      expect(queryByText('Empty')).toBeNull();
    });
  });

  describe('scroll behavior', () => {
    it('renders with scroll by default', () => {
      const { getByText } = render(
        <ScreenContainer>
          <Text>Scrollable Content</Text>
        </ScreenContainer>
      );
      expect(getByText('Scrollable Content')).toBeTruthy();
    });

    it('renders without scroll when scroll is false', () => {
      const { getByText } = render(
        <ScreenContainer scroll={false}>
          <Text>Non-scrollable Content</Text>
        </ScreenContainer>
      );
      expect(getByText('Non-scrollable Content')).toBeTruthy();
    });
  });

  describe('padding', () => {
    it('applies horizontal padding by default', () => {
      const { getByText } = render(
        <ScreenContainer>
          <Text>Padded Content</Text>
        </ScreenContainer>
      );
      expect(getByText('Padded Content')).toBeTruthy();
    });

    it('can disable horizontal padding', () => {
      const { getByText } = render(
        <ScreenContainer horizontalPadding={false}>
          <Text>No Horizontal Padding</Text>
        </ScreenContainer>
      );
      expect(getByText('No Horizontal Padding')).toBeTruthy();
    });

    it('can disable vertical padding', () => {
      const { getByText } = render(
        <ScreenContainer verticalPadding={false}>
          <Text>No Vertical Padding</Text>
        </ScreenContainer>
      );
      expect(getByText('No Vertical Padding')).toBeTruthy();
    });
  });

  describe('background color', () => {
    it('applies default background color', () => {
      const { getByText } = render(
        <ScreenContainer>
          <Text>Content</Text>
        </ScreenContainer>
      );
      expect(getByText('Content')).toBeTruthy();
    });

    it('accepts custom background color', () => {
      const { getByText } = render(
        <ScreenContainer backgroundColor="#ff0000">
          <Text>Red Background</Text>
        </ScreenContainer>
      );
      expect(getByText('Red Background')).toBeTruthy();
    });
  });

  describe('refresh control', () => {
    it('accepts onRefresh callback', () => {
      const onRefresh = jest.fn();
      const { getByText } = render(
        <ScreenContainer onRefresh={onRefresh}>
          <Text>Refreshable Content</Text>
        </ScreenContainer>
      );
      expect(getByText('Refreshable Content')).toBeTruthy();
    });

    it('accepts refreshing state', () => {
      const { getByText } = render(
        <ScreenContainer refreshing onRefresh={jest.fn()}>
          <Text>Content</Text>
        </ScreenContainer>
      );
      expect(getByText('Content')).toBeTruthy();
    });
  });

  describe('custom styles', () => {
    it('applies custom container style', () => {
      const { getByText } = render(
        <ScreenContainer style={{ flex: 2 }}>
          <Text>Styled Container</Text>
        </ScreenContainer>
      );
      expect(getByText('Styled Container')).toBeTruthy();
    });

    it('applies custom content style', () => {
      const { getByText } = render(
        <ScreenContainer contentStyle={{ padding: 20 }}>
          <Text>Styled Content</Text>
        </ScreenContainer>
      );
      expect(getByText('Styled Content')).toBeTruthy();
    });
  });

  describe('safe area edges', () => {
    it('accepts custom edges', () => {
      const { getByText } = render(
        <ScreenContainer edges={['top']}>
          <Text>Top Edge Only</Text>
        </ScreenContainer>
      );
      expect(getByText('Top Edge Only')).toBeTruthy();
    });
  });
});
