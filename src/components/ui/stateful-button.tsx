"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  onClick?: () => Promise<any> | void;
  children: React.ReactNode;
  className?: string;
}

export const Button = ({
  onClick,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) => {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (status === "loading") return;
    if (onClick) {
      try {
        const res = onClick();
        if (res instanceof Promise) {
          setStatus("loading");
          await res;
          setStatus("success");
          setTimeout(() => {
            setStatus("idle");
          }, 2000);
        }
      } catch (error) {
        setStatus("idle");
      }
    }
  };

  return (
    <motion.button
      layout
      disabled={disabled || status === "loading"}
      onClick={handleClick}
      className={cn(
        "relative min-w-[140px] px-6 py-2.5 rounded-xl font-medium text-sm transition-colors duration-200 flex items-center justify-center overflow-hidden",
        "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100",
        "shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === "idle" && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            {children}
          </motion.span>
        )}
        {status === "loading" && (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Processing...</span>
          </motion.span>
        )}
        {status === "success" && (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Success!</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default Button;
