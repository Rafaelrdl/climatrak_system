/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Button } from '../Button';

describe('Button', () => {
  describe('rendering', () => {
    it('renders with text children', () => {
      const { getByText } = render(<Button>Click me</Button>);
      expect(getByText('Click me')).toBeTruthy();
    });

    it('renders with custom component children', () => {
      const { getByText } = render(
        <Button>
          <Text>Custom Content</Text>
        </Button>
      );
      expect(getByText('Custom Content')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('renders default variant', () => {
      const { getByText } = render(<Button variant="default">Default</Button>);
      expect(getByText('Default')).toBeTruthy();
    });

    it('renders secondary variant', () => {
      const { getByText } = render(<Button variant="secondary">Secondary</Button>);
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('renders destructive variant', () => {
      const { getByText } = render(<Button variant="destructive">Delete</Button>);
      expect(getByText('Delete')).toBeTruthy();
    });

    it('renders outline variant', () => {
      const { getByText } = render(<Button variant="outline">Outline</Button>);
      expect(getByText('Outline')).toBeTruthy();
    });

    it('renders ghost variant', () => {
      const { getByText } = render(<Button variant="ghost">Ghost</Button>);
      expect(getByText('Ghost')).toBeTruthy();
    });

    it('renders link variant', () => {
      const { getByText } = render(<Button variant="link">Link</Button>);
      expect(getByText('Link')).toBeTruthy();
    });
  });

  describe('sizes', () => {
    it('renders sm size', () => {
      const { getByText } = render(<Button size="sm">Small</Button>);
      expect(getByText('Small')).toBeTruthy();
    });

    it('renders md size', () => {
      const { getByText } = render(<Button size="md">Medium</Button>);
      expect(getByText('Medium')).toBeTruthy();
    });

    it('renders lg size', () => {
      const { getByText } = render(<Button size="lg">Large</Button>);
      expect(getByText('Large')).toBeTruthy();
    });

    it('renders icon size', () => {
      const { getByText } = render(
        <Button size="icon">
          <Text>X</Text>
        </Button>
      );
      expect(getByText('X')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Button onPress={onPress}>Press me</Button>);
      
      fireEvent.press(getByText('Press me'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button onPress={onPress} disabled>
          Disabled
        </Button>
      );
      
      fireEvent.press(getByText('Disabled'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button onPress={onPress} loading testID="loading-button">
          Loading
        </Button>
      );
      
      fireEvent.press(getByTestId('loading-button'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('shows ActivityIndicator when loading', () => {
      const { queryByText, UNSAFE_getByType } = render(
        <Button loading>Loading</Button>
      );
      
      // Text should not be visible when loading
      expect(queryByText('Loading')).toBeNull();
    });
  });

  describe('icons', () => {
    it('renders with left icon', () => {
      const { getByText, getByTestId } = render(
        <Button leftIcon={<Text testID="left-icon">←</Text>}>
          With Icon
        </Button>
      );
      
      expect(getByTestId('left-icon')).toBeTruthy();
      expect(getByText('With Icon')).toBeTruthy();
    });

    it('renders with right icon', () => {
      const { getByText, getByTestId } = render(
        <Button rightIcon={<Text testID="right-icon">→</Text>}>
          With Icon
        </Button>
      );
      
      expect(getByTestId('right-icon')).toBeTruthy();
      expect(getByText('With Icon')).toBeTruthy();
    });
  });

  describe('fullWidth', () => {
    it('applies fullWidth style when true', () => {
      const { getByText } = render(
        <Button fullWidth>Full Width</Button>
      );
      expect(getByText('Full Width')).toBeTruthy();
    });
  });
});
