import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: ('closed' | 'half' | 'full')[];
}

const DEFAULT_SNAP_POINTS = ['closed', 'half', 'full'] as const;

// Snap positions: translateY values for each snap state
const SNAP_Y: Record<'closed' | 'half' | 'full', string> = {
  closed: '100%',
  half: 'calc(100% - 60vh)',
  full: '0%',
};

const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  children,
  snapPoints = DEFAULT_SNAP_POINTS,
}) => {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Create portal container if it doesn't exist
  useEffect(() => {
    let container = document.getElementById('bottom-sheet-portal') as HTMLDivElement | null;
    if (!container) {
      container = document.createElement('div');
      container.id = 'bottom-sheet-portal';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    return () => {
      // Clean up portal container only if no other instances are using it
      // (In practice, we leave it to avoid flicker with multiple sheets)
    };
  }, []);

  // Handle Esc key press to close
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Handle drag end to snap to nearest position or dismiss
  const handleDragEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: { velocity: { y: number }; point: { y: number } }
    ) => {
      // Swipe down to dismiss: if velocity is downward and strong enough
      if (info.velocity.y > 500) {
        onClose();
        return;
      }

      // Get current sheet position to determine snap
      if (!sheetRef.current) return;
      const sheetRect = sheetRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const currentYPercent = (sheetRect.top / viewportHeight) * 100;

      // Determine closest snap point
      const snapPositions = {
        full: 0,
        half: 100 - 60, // 40% from top (60vh visible)
        closed: 100,
      };

      let closestSnap: 'closed' | 'half' | 'full' = 'closed';
      let minDistance = Infinity;

      (snapPoints as ('closed' | 'half' | 'full')[]).forEach((snap) => {
        const distance = Math.abs(currentYPercent - snapPositions[snap]);
        if (distance < minDistance) {
          minDistance = distance;
          closestSnap = snap;
        }
      });

      if (closestSnap === 'closed') {
        onClose();
      }
    },
    [onClose, snapPoints]
  );

  // Current snap position based on open state
  const currentSnap: 'closed' | 'half' | 'full' = open ? 'half' : 'closed';

  const sheetContent = (
    <AnimatePresence>
      {open && (
        <>
          {/* Dimmed + desaturated backdrop */}
          <motion.div
            data-testid="bottom-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'grayscale(100%)',
              zIndex: 40,
            }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            data-testid="bottom-sheet"
            initial={{ translateY: SNAP_Y.closed }}
            animate={{ translateY: SNAP_Y[currentSnap] }}
            exit={{ translateY: SNAP_Y.closed }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 100 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              zIndex: 50,
              maxHeight: '100vh',
              overflowY: 'auto',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Drag handle: 36x4px rounded bar */}
            <div
              data-testid="bottom-sheet-drag-handle"
              style={{
                width: '36px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: '#e0e0e0',
                margin: '12px auto',
                cursor: 'grab',
              }}
            />

            {/* Sheet content */}
            <div style={{ padding: '0 16px 24px' }}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Render via portal
  return portalContainer
    ? createPortal(sheetContent, portalContainer)
    : null;
};

export default BottomSheet;
