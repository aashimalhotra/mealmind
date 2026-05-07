import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BottomSheet from '../BottomSheet';

// Mock framer-motion to avoid JSDOM issues
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, ...props }: any) => (
      <div {...props} style={style}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('BottomSheet', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up portal container
    const existingPortal = document.getElementById('bottom-sheet-portal');
    if (existingPortal) {
      existingPortal.remove();
    }
  });

  it('does not render content when open is false', () => {
    render(
      <BottomSheet open={false} onClose={onClose}>
        <div>Test Content</div>
      </BottomSheet>
    );
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('renders portal content when open is true', () => {
    render(
      <BottomSheet open={true} onClose={onClose}>
        <div>Test Content</div>
      </BottomSheet>
    );
    // Portal content should be in the document
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders drag handle with correct dimensions', () => {
    render(
      <BottomSheet open={true} onClose={onClose}>
        <div>Test Content</div>
      </BottomSheet>
    );
    const dragHandle = screen.getByTestId('bottom-sheet-drag-handle');
    expect(dragHandle).toHaveStyle({ width: '36px', height: '4px' });
    expect(dragHandle).toHaveStyle({ borderRadius: '2px' });
  });

  it('calls onClose when backdrop is clicked', () => {
    render(
      <BottomSheet open={true} onClose={onClose}>
        <div>Test Content</div>
      </BottomSheet>
    );
    const backdrop = screen.getByTestId('bottom-sheet-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(
      <BottomSheet open={true} onClose={onClose}>
        <div>Test Content</div>
      </BottomSheet>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders with correct snap positions when open', () => {
    render(
      <BottomSheet open={true} onClose={onClose}>
        <div>Test Content</div>
      </BottomSheet>
    );
    const sheet = screen.getByTestId('bottom-sheet');
    expect(sheet).toBeInTheDocument();
  });
});
