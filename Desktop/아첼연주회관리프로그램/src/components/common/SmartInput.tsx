import { InputHTMLAttributes, forwardRef } from 'react';

interface SmartInputProps extends InputHTMLAttributes<HTMLInputElement> {
  name?: string;
  error?: string;
}

const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(
  ({ name, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          {...props}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${className} ${error ? 'border-red-500' : ''}`}
          placeholder={name}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

SmartInput.displayName = 'SmartInput';

export default SmartInput;
