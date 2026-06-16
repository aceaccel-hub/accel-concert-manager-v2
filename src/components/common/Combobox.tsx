import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X, Check, Trash2 } from 'lucide-react';
import type { MasterItemCategory } from '../../types';
import { db } from '../../db/database';

function showToast(message: string) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className =
    'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-pulse';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

interface ComboboxProps {
  category: MasterItemCategory;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultOptions: string[];
  disabled?: boolean;
}

export default function Combobox({
  category,
  value,
  onChange,
  placeholder = '입력하거나 선택하세요',
  defaultOptions,
  disabled = false,
}: ComboboxProps) {
  const [items, setItems] = useState<string[]>([]);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadItems();
  }, [category]);

  useEffect(() => {
    setInput(value);
  }, [value]);

  const loadItems = async () => {
    const saved = await db.masterItems.where('category').equals(category).toArray();
    const savedValues = saved.map((item) => item.value);
    setSavedItems(new Set(savedValues));

    // defaultOptions이 있으면 표준 선택지만 사용, 없으면 DB 저장값과 함께 표시
    const unique = defaultOptions.length > 0
      ? defaultOptions
      : Array.from(new Set([...defaultOptions, ...savedValues]));

    setItems(unique);
    setFiltered(unique);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    onChange(val);
    if (val) {
      const matches = items.filter((item) => item.toLowerCase().includes(val.toLowerCase()));
      setFiltered(matches);
    } else {
      setFiltered(items);
    }
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Escape: 드롭다운 닫기
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (!open) {
      // 드롭다운이 닫혀있으면 Enter로 열기
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    // 드롭다운이 열려있을 때
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filtered.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        // 선택된 항목 확정
        handleSelect(filtered[highlightedIndex]);
      } else if (input.trim()) {
        // 커스텀 입력값 확정
        handleSelect(input.trim());
      }
      setHighlightedIndex(-1);
    }
  };

  const handleDelete = async (e: React.MouseEvent, itemToDelete: string) => {
    e.stopPropagation();
    const item = await db.masterItems
      .where('category')
      .equals(category)
      .filter((i) => i.value === itemToDelete)
      .first();

    if (item) {
      await db.masterItems.delete(item.id);
      setSavedItems((prev) => {
        const next = new Set(prev);
        next.delete(itemToDelete);
        return next;
      });
      setItems((prev) => prev.filter((i) => i !== itemToDelete));
      setFiltered((prev) => prev.filter((i) => i !== itemToDelete));
      showToast(`"${itemToDelete}" 블록이 삭제되었습니다`);
    }
  };

  const handleSelect = async (selectedValue: string) => {
    setInput(selectedValue);
    onChange(selectedValue);
    setOpen(false);

    // 새 값이면 DB에 저장
    if (!savedItems.has(selectedValue)) {
      const newItem = {
        id: crypto.randomUUID(),
        category,
        value: selectedValue,
        createdAt: new Date().toISOString(),
      };
      await db.masterItems.add(newItem);
      setSavedItems(new Set([...savedItems, selectedValue]));
      if (!items.includes(selectedValue)) {
        setItems([...items, selectedValue]);
      }
      showToast(`"${selectedValue}" 블록으로 저장되었습니다`);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInput('');
    onChange('');
    setFiltered(items);
  };

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 100);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`input p-0 flex items-center justify-between cursor-text relative transition-all ${
          open ? 'border-blue-400 shadow-sm' : 'border-gray-200'
        }`}
        onClick={() => setOpen(true)}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-3 py-2 bg-transparent outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex items-center gap-1 pr-2">
          {input && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
              type="button"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-b-0 group transition-colors ${
                  highlightedIndex === idx
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseLeave={() => setHighlightedIndex(-1)}
                  className={`flex-1 text-left text-sm ${
                    highlightedIndex === idx ? 'font-medium text-gray-900' : 'text-gray-700'
                  }`}
                  type="button"
                >
                  {item}
                </button>
                {savedItems.has(item) && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                      <Check size={12} /> 저장됨
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, item)}
                      className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      type="button"
                      title="삭제"
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : input ? (
            <button
              onClick={() => handleSelect(input)}
              onMouseEnter={() => setHighlightedIndex(0)}
              onMouseLeave={() => setHighlightedIndex(-1)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                highlightedIndex === 0
                  ? 'bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              type="button"
            >
              <span className="font-medium text-blue-600">"{input}"</span>
              <span className="text-gray-500"> 추가하기 (엔터 또는 클릭)</span>
            </button>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-400">항목이 없습니다</div>
          )}
        </div>
      )}
    </div>
  );
}
