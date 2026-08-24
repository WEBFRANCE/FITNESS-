'use client';

import type { ReactNode, ButtonHTMLAttributes, ComponentProps } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ── GlassCard ────────────────────────────────────────────────────────
type Clarity = 'opaque' | 'balanced' | 'clear';

// ComponentProps<typeof motion.div> plutôt qu'un type nommé importé de la
// librairie : plus robuste si son nom d'export change entre versions.
interface GlassCardProps extends ComponentProps<typeof motion.div> {
  children: ReactNode;
  clarity?: Clarity;
  className?: string;
}

export function GlassCard({ children, clarity = 'balanced', className = '', ...motionProps }: GlassCardProps) {
  return (
    <motion.div
      layout
      className={`glass rounded-glass p-4 ${className}`}
      data-clarity={clarity}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

// ── GlassButton ──────────────────────────────────────────────────────
interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'accent' | 'neutral';
}

export function GlassButton({ variant = 'neutral', className = '', children, ...props }: GlassButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-40 disabled:active:scale-100';
  const variantClass =
    variant === 'accent' ? 'bg-accent text-black' : 'glass text-[var(--text-primary)]';

  return (
    <button className={`${base} ${variantClass} ${className}`} data-clarity="balanced" {...props}>
      {children}
    </button>
  );
}

// ── GlassSheet (bottom sheet modal) ─────────────────────────────────
interface GlassSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function GlassSheet({ open, onClose, children, title }: GlassSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="glass fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-glass px-5 pb-8 pt-4"
            data-clarity="opaque"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            {title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── NumericKeypad ────────────────────────────────────────────────────
interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  allowDecimal?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export function NumericKeypad({ value, onChange, onConfirm, allowDecimal = true }: NumericKeypadProps) {
  function press(key: string) {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === '.' && (!allowDecimal || value.includes('.'))) return;
    if (value.length >= 6) return;
    onChange(value + key);
  }

  return (
    <div className="glass rounded-glass p-3" data-clarity="opaque">
      <div className="mb-3 grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            className="rounded-2xl bg-white/[0.04] py-3 text-lg font-medium active:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            {key}
          </button>
        ))}
      </div>
      <GlassButton variant="accent" className="w-full" onClick={onConfirm}>
        Valider
      </GlassButton>
    </div>
  );
}
