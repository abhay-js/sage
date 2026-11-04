import {sageColors as c} from '../lib/theme';
interface Props {
  value: Date;
  onChange: (d: Date) => void;
  mode: 'date' | 'time';
  minimumDate?: Date;
  accessibilityLabel?: string;
}

export function DatePickerField({ value, onChange, mode, minimumDate, accessibilityLabel }: Props) {
  const inputValue =
    mode === 'date'
      ? `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`
      : `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

  const minValue =
    minimumDate && mode === 'date' ? `${minimumDate.getFullYear()}-${String(minimumDate.getMonth()+1).padStart(2,'0')}-${String(minimumDate.getDate()).padStart(2,'0')}` : undefined;

  return (
    <input
      aria-label={accessibilityLabel}
      type={mode === 'date' ? 'date' : 'time'}
      value={inputValue}
      min={minValue}
      onChange={(e) => {
        if (!e.target.value) return;
        if (mode === 'date') {
          const [y, m, d] = e.target.value.split('-').map(Number);
          const next = new Date(value);
          next.setFullYear(y, m - 1, d);
          onChange(next);
        } else {
          const [h, m] = e.target.value.split(':').map(Number);
          const next = new Date(value);
          next.setHours(h, m, 0, 0);
          onChange(next);
        }
      }}
      style={{
        width: '100%',
        background: c.surface,
        color: c.text,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        padding: '10px 16px',
        fontSize: 14,
        boxSizing: 'border-box',
        colorScheme: 'light',
        outline: 'none',
      } as React.CSSProperties}
    />
  );
}
