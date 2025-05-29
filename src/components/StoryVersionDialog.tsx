import { X } from 'lucide-react';

interface StoryVersionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (version: 'v1' | 'v2', notes?: string) => void;
}

export function StoryVersionDialog({ isOpen, onClose, onSelect }: StoryVersionDialogProps) {
  if (!isOpen) return null;
  const [notes, setNotes] = useState('');

  const handleSelect = (version: 'v1' | 'v2') => {
    onSelect(version, notes.trim() || undefined);
    setNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative border border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-semibold text-gray-100 mb-4">
          Select Story Version
        </h2>
        
        <p className="text-gray-300 mb-6">
          Choose which version of the story generator to use:
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Emphasize anything? (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g., highlight the recent sale of Rhode Skin to ELF for $1 billion and what that means for future celebrity brands"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent h-24"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleSelect('v1')}
            className="bg-gray-700 hover:bg-gray-600 text-gray-100 py-4 px-6 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
          >
            <div className="text-lg font-medium mb-1">Version 1</div>
            <div className="text-sm text-gray-400">Classic Format</div>
          </button>
          
          <button
            onClick={() => handleSelect('v2')}
            className="bg-teal-900/50 hover:bg-teal-800/50 text-teal-100 py-4 px-6 rounded-lg border border-teal-700/50 hover:border-teal-600/50 transition-colors"
          >
            <div className="text-lg font-medium mb-1">Version 2</div>
            <div className="text-sm text-teal-300">Zero to Hero</div>
          </button>
        </div>
      </div>
    </div>
  );
}