import * as React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:border-input hover:border-input disabled:cursor-not-allowed disabled:opacity-50 select-custom-arrow ${className || ''}`}
        ref={ref}
        {...props}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export { Select };
