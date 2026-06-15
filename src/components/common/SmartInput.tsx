import { InputHTMLAttributes, forwardRef } from 'react';

interface SmartInputProps extends InputHTMLAttributes<HTMLInputElement> {
  name?: string;
  error?: string;
}

const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(
  ({ name, error, className = '', type, value, onChange, ...props }, ref) => {
    const isNumberInput = type === 'number';

    const formatNumber = (num: string | number): string => {
      if (!num && num !== 0) return '';
      const numStr = String(num).replace(/,/g, '');
      const parsed = parseInt(numStr, 10);
      return isNaN(parsed) ? '' : parsed.toLocaleString();
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isNumberInput || !onChange) return;
      const input = e.target.value.replace(/,/g, '');
      const parsed = parseInt(input, 10);
      const normalizedValue = isNaN(parsed) ? '' : String(parsed);
      const event = {
        ...e,
        target: { ...e.target, value: normalizedValue },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    };

    const displayValue = isNumberInput && value ? formatNumber(value) : value;

    return (
      <div className="w-full">
        <input
          ref={ref}
          type={isNumberInput ? 'text' : type}
          value={displayValue}
          onChange={isNumberInput ? handleNumberChange : onChange}
          {...props}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 focus:shadow-sm transition ${className} ${error ? 'border-red-500' : ''}`}
          placeholder={name}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

SmartInput.displayName = 'SmartInput';

export default SmartInput;
