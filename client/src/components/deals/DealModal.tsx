import { DealWithMerchant } from "@shared/schema";

interface DealModalProps {
  deal: DealWithMerchant;
  onClose: () => void;
  onClaim: () => void;
}

export default function DealModal({ deal, onClose, onClaim }: DealModalProps) {
  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-end justify-center"
      onClick={() => {
        console.log('Background clicked - calling onClose');
        onClose();
      }}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Handle Bar */}
          <div 
            className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6 cursor-pointer hover:bg-gray-400 transition-colors"
            onClick={() => {
              console.log('Handle bar clicked - calling onClose');
              onClose();
            }}
          />
          
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{deal.merchant.name}</h2>
              <p className="text-gray-600">{deal.title}</p>
            </div>
            <button
              onClick={() => {
                console.log('X button clicked - calling onClose');
                onClose();
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Simple content */}
          <div className="mb-6">
            <p className="text-gray-700">{deal.description}</p>
            <div className="mt-4">
              <span className="text-2xl font-bold text-gray-800">${deal.discountedPrice}</span>
              <span className="text-lg text-gray-500 line-through ml-2">${deal.originalPrice}</span>
            </div>
          </div>

          {/* Simple close button */}
          <button 
            onClick={() => {
              console.log('Close button clicked - calling onClose');
              onClose();
            }}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}