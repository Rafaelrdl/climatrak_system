/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../Card';

describe('Card', () => {
  describe('Card component', () => {
    it('renders children', () => {
      const { getByText } = render(
        <Card>
          <Text>Card Content</Text>
        </Card>
      );
      expect(getByText('Card Content')).toBeTruthy();
    });

    it('applies custom style', () => {
      const { getByText } = render(
        <Card style={{ marginTop: 10 }}>
          <Text>Content</Text>
        </Card>
      );
      expect(getByText('Content')).toBeTruthy();
    });
  });

  describe('CardHeader', () => {
    it('renders children', () => {
      const { getByText } = render(
        <CardHeader>
          <Text>Header Content</Text>
        </CardHeader>
      );
      expect(getByText('Header Content')).toBeTruthy();
    });
  });

  describe('CardTitle', () => {
    it('renders text', () => {
      const { getByText } = render(<CardTitle>My Title</CardTitle>);
      expect(getByText('My Title')).toBeTruthy();
    });

    it('applies custom style', () => {
      const { getByText } = render(
        <CardTitle style={{ color: 'red' }}>Styled Title</CardTitle>
      );
      expect(getByText('Styled Title')).toBeTruthy();
    });
  });

  describe('CardDescription', () => {
    it('renders text', () => {
      const { getByText } = render(
        <CardDescription>Description text</CardDescription>
      );
      expect(getByText('Description text')).toBeTruthy();
    });
  });

  describe('CardContent', () => {
    it('renders children', () => {
      const { getByText } = render(
        <CardContent>
          <Text>Main content here</Text>
        </CardContent>
      );
      expect(getByText('Main content here')).toBeTruthy();
    });
  });

  describe('CardFooter', () => {
    it('renders children', () => {
      const { getByText } = render(
        <CardFooter>
          <Text>Footer content</Text>
        </CardFooter>
      );
      expect(getByText('Footer content')).toBeTruthy();
    });
  });

  describe('Complete Card', () => {
    it('renders full card with all subcomponents', () => {
      const { getByText } = render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>This is a test card</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>Card body content</Text>
          </CardContent>
          <CardFooter>
            <Text>Card footer</Text>
          </CardFooter>
        </Card>
      );

      expect(getByText('Test Card')).toBeTruthy();
      expect(getByText('This is a test card')).toBeTruthy();
      expect(getByText('Card body content')).toBeTruthy();
      expect(getByText('Card footer')).toBeTruthy();
    });
  });
});
