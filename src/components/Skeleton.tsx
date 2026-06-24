import { cn } from '../utils/cn';

interface SkeletonBoxProps {
  className?: string;
}

function SkeletonBox({ className }: SkeletonBoxProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-stone-200 rounded-xl',
        className
      )}
    />
  );
}

export function Skeleton() {
  return null;
}

Skeleton.Box = SkeletonBox;
