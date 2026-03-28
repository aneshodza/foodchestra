import type { ElementType, ReactNode } from 'react';
import './GlassBlock.scss';

interface GlassBlockProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

function GlassBlock({ children, className = '', as: Tag = 'div' }: GlassBlockProps) {
  return (
    <Tag className={`glass-block ${className}`.trim()}>
      {children}
    </Tag>
  );
}

export default GlassBlock;
