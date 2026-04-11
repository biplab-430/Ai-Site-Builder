import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

/* ================= TYPES ================= */

interface ElementStyles {
  padding: string;
  margin: string;
  backgroundColor: string;
  color: string;
  fontSize: string;
}

interface SelectedElement {
  tagName: string;
  className: string;
  text: string;
  styles: ElementStyles;
}

interface EditorPanelProps {
  selectedElement: SelectedElement | null;
  onUpdate: (updates: {
    text?: string;
    className?: string;
    styles?: Partial<ElementStyles>;
  }) => void;
  onClose: () => void;
}

/* ============== HELPERS ================= */

const rgbToHex = (color: string) => {
  if (!color) return '#000000';
  if (color.startsWith('#')) return color;

  const match = color.match(/\d+/g);
  if (!match) return '#000000';

  const [r, g, b] = match.map(Number);
  return (
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
};

/* ============== COMPONENT ================= */

const EditorPanel = ({
  selectedElement,
  onUpdate,
  onClose,
}: EditorPanelProps) => {

  const [values, setValues] = useState<SelectedElement | null>(null);

  useEffect(() => {
    setValues(selectedElement);
  }, [selectedElement]);

  if (!values) return null;

  /* -------- Text / Class updates -------- */

  const handleChange = (field: 'text' | 'className', value: string) => {
    setValues((prev) =>
      prev ? { ...prev, [field]: value } : prev
    );
    onUpdate({ [field]: value });
  };

  /* -------- Style updates -------- */

  const handleStyleChange = (
    styleName: keyof ElementStyles,
    value: string
  ) => {
    setValues((prev) =>
      prev
        ? {
            ...prev,
            styles: { ...prev.styles, [styleName]: value },
          }
        : prev
    );

    onUpdate({ styles: { [styleName]: value } });
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 animate-fade-in fade-in ">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">Edit Element</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-4 text-black">
        {/* Text Content */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Text Content
          </label>
          <textarea
            className="w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none min-h-20"
            value={values.text}
            onChange={(e) =>
              handleChange('text', e.target.value)
            }
          />
        </div>

        {/* Class Name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Class Name
          </label>
          <input
            type="text"
            className="w-full text-sm p-2 border border-gray-400 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
            value={values.className}
            onChange={(e) =>
              handleChange('className', e.target.value)
            }
          />
        </div>

        {/* Padding & Margin */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Padding
            </label>
            <input
              type="text"
              className="w-full text-sm p-2 border border-gray-400 rounded-md"
              value={values.styles.padding}
              onChange={(e) =>
                handleStyleChange('padding', e.target.value)
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Margin
            </label>
            <input
              type="text"
              className="w-full text-sm p-2 border border-gray-400 rounded-md"
              value={values.styles.margin}
              onChange={(e) =>
                handleStyleChange('margin', e.target.value)
              }
            />
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Font Size
          </label>
          <input
            type="text"
            className="w-full text-sm p-2 border border-gray-400 rounded-md"
            value={values.styles.fontSize}
            onChange={(e) =>
              handleStyleChange('fontSize', e.target.value)
            }
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-3">
          {/* Background Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Background
            </label>
            <div className="flex items-center gap-2 border border-gray-400 rounded-md p-1">
              <input
                type="color"
                className="w-6 h-6 cursor-pointer"
                value={rgbToHex(values.styles.backgroundColor)}
                onChange={(e) =>
                  handleStyleChange(
                    'backgroundColor',
                    e.target.value
                  )
                }
              />
              <span className="text-xs text-gray-600 truncate">
                {rgbToHex(values.styles.backgroundColor)}
              </span>
            </div>
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Text Color
            </label>
            <div className="flex items-center gap-2 border border-gray-400 rounded-md p-1">
              <input
                type="color"
                className="w-6 h-6 cursor-pointer"
                value={rgbToHex(values.styles.color)}
                onChange={(e) =>
                  handleStyleChange('color', e.target.value)
                }
              />
              <span className="text-xs text-gray-600 truncate">
                {rgbToHex(values.styles.color)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
