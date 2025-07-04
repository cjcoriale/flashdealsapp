import { DealWithMerchant } from "@shared/schema";

interface DealModalProps {
  deal: DealWithMerchant;
  onClose: () => void;
  onClaim: () => void;
}

export default function DealModal({ deal, onClose, onClaim }: DealModalProps) {
  console.log('DealModal rendering...', deal);
  console.log('onClose function:', onClose);
  
  const handleClose = () => {
    console.log('handleClose called');
    try {
      onClose();
      console.log('onClose executed successfully');
    } catch (error) {
      console.error('Error calling onClose:', error);
    }
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
      onClick={(e) => {
        console.log('Background clicked, target:', e.target, 'currentTarget:', e.currentTarget);
        if (e.target === e.currentTarget) {
          console.log('Background click confirmed, calling handleClose');
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white p-6 rounded-lg max-w-md w-full mx-4"
        onClick={(e) => {
          console.log('Modal content clicked, stopping propagation');
          e.stopPropagation();
        }}
      >
        <h2 className="text-xl font-bold mb-4">Test Modal</h2>
        <p className="mb-4">Modal is working!</p>
        <button 
          onClick={(e) => {
            console.log('Close button clicked');
            e.preventDefault();
            e.stopPropagation();
            handleClose();
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}