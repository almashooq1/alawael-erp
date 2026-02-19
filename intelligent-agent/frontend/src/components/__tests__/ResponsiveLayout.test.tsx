import React from 'react';
import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import '@testing-library/jest-dom';
import {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack,
  ResponsiveShow,
  ResponsiveHide,
  AspectRatio,
  TouchArea,
} from '../ResponsiveLayout';

// Mock useResponsive hook
jest.mock('../../hooks/useMediaQuery', () => ({
  useResponsive: () => ({
    currentBreakpoint: 'lg',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLargeScreen: false,
    isPortrait: false,
    isLandscape: true,
    isTouchDevice: false,
    screenWidth: 1024,
    screenHeight: 768,
  }),
}));

describe('ResponsiveLayout', () => {
  describe('ResponsiveContainer', () => {
    it('renders children with default props', () => {
      render(
        <ResponsiveContainer>
          <div>Content</div>
        </ResponsiveContainer>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('applies custom max width', () => {
      const { container } = render(
        <ResponsiveContainer maxWidth="md">
          <div>Narrow Content</div>
        </ResponsiveContainer>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ maxWidth: '768px' });
    });

    it('centers content when specified', () => {
      const { container } = render(
        <ResponsiveContainer center={true}>
          <div>Centered</div>
        </ResponsiveContainer>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ marginLeft: 'auto', marginRight: 'auto' });
    });

    it('applies padding when enabled', () => {
      const { container } = render(
        <ResponsiveContainer padding={true}>
          <div>Padded</div>
        </ResponsiveContainer>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ paddingLeft: '1rem', paddingRight: '1rem' });
    });
  });

  describe('ResponsiveGrid', () => {
    it('renders grid with children', () => {
      render(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('applies grid layout styles', () => {
      const { container } = render(
        <ResponsiveGrid columns={{ xs: 1, md: 2, lg: 3 }} gap={20}>
          <div>Grid Item</div>
        </ResponsiveGrid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveStyle({ display: 'grid', gap: '20px' });
    });

    it('uses correct column count based on breakpoint', () => {
      const { container } = render(
        <ResponsiveGrid columns={{ xs: 1, sm: 2, lg: 4 }}>
          <div>Col Item</div>
        </ResponsiveGrid>
      );

      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(4, 1fr)' });
    });
  });

  describe('ResponsiveStack', () => {
    it('renders stack with children', () => {
      render(
        <ResponsiveStack>
          <div>Stack 1</div>
          <div>Stack 2</div>
        </ResponsiveStack>
      );

      expect(screen.getByText('Stack 1')).toBeInTheDocument();
      expect(screen.getByText('Stack 2')).toBeInTheDocument();
    });

    it('applies flexbox layout', () => {
      const { container } = render(
        <ResponsiveStack direction={{ xs: 'column', md: 'row' }} gap={16}>
          <div>Flex Item</div>
        </ResponsiveStack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack).toHaveStyle({ display: 'flex', gap: '16px' });
    });

    it('uses correct alignment and justification', () => {
      const { container } = render(
        <ResponsiveStack align="center" justify="space-between">
          <div>Aligned</div>
        </ResponsiveStack>
      );

      const stack = container.firstChild as HTMLElement;
      expect(stack).toHaveStyle({
        alignItems: 'center',
        justifyContent: 'space-between',
      });
    });
  });

  describe('ResponsiveShow', () => {
    it('shows content based on breakpoint', () => {
      render(
        <ResponsiveShow above="md">
          <div>Desktop Only</div>
        </ResponsiveShow>
      );

      expect(screen.getByText('Desktop Only')).toBeInTheDocument();
    });

    it('hides content below breakpoint', () => {
      render(
        <ResponsiveShow above="xl">
          <div>XL Only</div>
        </ResponsiveShow>
      );

      // Should be hidden since current is lg
      expect(screen.queryByText('XL Only')).not.toBeInTheDocument();
    });
  });

  describe('ResponsiveHide', () => {
    it('hides content at specified breakpoints', () => {
      render(
        <ResponsiveHide only={['xs', 'sm']}>
          <div>Hidden on Mobile</div>
        </ResponsiveHide>
      );

      expect(screen.getByText('Hidden on Mobile')).toBeInTheDocument();
    });
  });

  describe('AspectRatio', () => {
    it('renders with correct aspect ratio', () => {
      const { container } = render(
        <AspectRatio ratio={16 / 9}>
          <div>16:9 Content</div>
        </AspectRatio>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({
        position: 'relative',
        paddingBottom: `${(9 / 16) * 100}%`,
      });
    });

    it('applies custom max width', () => {
      const { container } = render(
        <AspectRatio ratio={4 / 3} maxWidth="500px">
          <div>4:3 Content</div>
        </AspectRatio>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ maxWidth: '500px' });
    });
  });

  describe('TouchArea', () => {
    it('renders with minimum touch target size', () => {
      const { container } = render(
        <TouchArea>
          <button>Touch Me</button>
        </TouchArea>
      );

      const touchArea = container.firstChild as HTMLElement;
      expect(touchArea).toHaveStyle({
        minWidth: '44px',
        minHeight: '44px',
      });
    });

    it('calls onTap when clicked', () => {
      const handleTap = jest.fn();

      render(
        <TouchArea onTap={handleTap}>
          <button>Tap</button>
        </TouchArea>
      );

      fireEvent.click(screen.getByText('Tap').parentElement!);
      expect(handleTap).toHaveBeenCalledTimes(1);
    });

    it('applies custom minimum size', () => {
      const { container } = render(
        <TouchArea minSize={60}>
          <button>Large Touch</button>
        </TouchArea>
      );

      const touchArea = container.firstChild as HTMLElement;
      expect(touchArea).toHaveStyle({
        minWidth: '60px',
        minHeight: '60px',
      });
    });
  });
});
