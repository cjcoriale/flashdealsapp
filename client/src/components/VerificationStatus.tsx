import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle, Shield } from "lucide-react";

interface VerificationStatusProps {
  merchant: any;
  className?: string;
}

export default function VerificationStatus({ merchant, className = "" }: VerificationStatusProps) {
  const getVerificationBadge = () => {
    const status = merchant.verificationStatus;
    
    if (status === 'verified') {
      return (
        <Badge variant="default" className={`bg-green-100 text-green-800 ${className}`}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified Business
        </Badge>
      );
    }
    
    if (status === 'pending' && (merchant.googleMyBusinessVerified || merchant.phoneVerified)) {
      return (
        <Badge variant="secondary" className={`bg-yellow-100 text-yellow-800 ${className}`}>
          <Clock className="h-3 w-3 mr-1" />
          Partially Verified
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className={`${className}`}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        Unverified
      </Badge>
    );
  };

  const getVerificationDetails = () => {
    const details = [];
    
    if (merchant.googleMyBusinessVerified) {
      details.push("Google verified");
    }
    
    if (merchant.phoneVerified) {
      details.push("Phone verified");
    }
    
    return details;
  };

  return (
    <div className="flex items-center gap-2">
      {getVerificationBadge()}
      {merchant.verificationStatus === 'verified' && (
        <Shield className="h-4 w-4 text-green-600" title="Verified Business" />
      )}
    </div>
  );
}