import { DealWithMerchant } from "@shared/schema";

interface DealModalProps {
  deal: DealWithMerchant;
  onClose: () => void;
  onClaim: () => void;
}

export default function DealModal({ deal, onClose, onClaim }: DealModalProps) {
  console.log('DealModal rendering...', deal);
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
      onClick={(e) => {
        console.log('Background clicked');
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Test Modal</h2>
        <p className="mb-4">Modal is working!</p>
        <button 
          onClick={() => {
            console.log('Close button clicked');
            onClose();
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}