/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Badge } from '../Badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('renders text children', () => {
      const { getByText } = render(<Badge>New</Badge>);
      expect(getByText('New')).toBeTruthy();
    });

    it('renders with icon', () => {
      const { getByText, getByTestId } = render(
        <Badge icon={<Text testID="badge-icon">✓</Text>}>
          Active
        </Badge>
      );
      expect(getByTestId('badge-icon')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
    });
  });

  describe('variants', () => {
    it('renders default variant', () => {
      const { getByText } = render(<Badge variant="default">Default</Badge>);
      expect(getByText('Default')).toBeTruthy();
    });

    it('renders secondary variant', () => {
      const { getByText } = render(<Badge variant="secondary">Secondary</Badge>);
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('renders destructive variant', () => {
      const { getByText } = render(<Badge variant="destructive">Error</Badge>);
      expect(getByText('Error')).toBeTruthy();
    });

    it('renders outline variant', () => {
      const { getByText } = render(<Badge variant="outline">Outline</Badge>);
      expect(getByText('Outline')).toBeTruthy();
    });

    it('renders success variant', () => {
      const { getByText } = render(<Badge variant="success">Success</Badge>);
      expect(getByText('Success')).toBeTruthy();
    });

    it('renders warning variant', () => {
      const { getByText } = render(<Badge variant="warning">Warning</Badge>);
      expect(getByText('Warning')).toBeTruthy();
    });
  });

  describe('sizes', () => {
    it('renders sm size', () => {
      const { getByText } = render(<Badge size="sm">Small</Badge>);
      expect(getByText('Small')).toBeTruthy();
    });

    it('renders md size', () => {
      const { getByText } = render(<Badge size="md">Medium</Badge>);
      expect(getByText('Medium')).toBeTruthy();
    });
  });

  describe('custom styling', () => {
    it('applies custom container style', () => {
      const { getByText } = render(
        <Badge style={{ marginLeft: 10 }}>Styled</Badge>
      );
      expect(getByText('Styled')).toBeTruthy();
    });

    it('applies custom text style', () => {
      const { getByText } = render(
        <Badge textStyle={{ fontWeight: 'bold' }}>Bold</Badge>
      );
      expect(getByText('Bold')).toBeTruthy();
    });
  });

  describe('text truncation', () => {
    it('truncates long text to one line', () => {
      const { getByText } = render(
        <Badge>This is a very long badge text that should be truncated</Badge>
      );
      const textElement = getByText('This is a very long badge text that should be truncated');
      expect(textElement.props.numberOfLines).toBe(1);
    });
  });
});
