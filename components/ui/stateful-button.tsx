export * from "@/components/ui/stateful-button";
export { default } from "@/components/ui/stateful-button";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  onClick?: () => Promise<any> | void;
  children: React.ReactNode;
  className?: string;
}
