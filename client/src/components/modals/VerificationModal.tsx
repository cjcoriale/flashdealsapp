import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, AlertTriangle, Phone, Globe, Clock, Shield, Loader2, RefreshCw } from "lucide-react";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: any;
}

export default function VerificationModal({ isOpen, onClose, merchant }: VerificationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phoneCode, setPhoneCode] = useState("");
  const [step, setStep] = useState<'overview' | 'google' | 'phone'>('overview');
  const [timeLeft, setTimeLeft] = useState(0);

  // Fetch verification status
  const { data: verificationStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: [`/api/merchants/${merchant?.id}/verification-status`],
    enabled: isOpen && !!merchant?.id,
  });

  // Timer for phone verification expiry
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [timeLeft]);

  // Google My Business verification mutation
  const googleVerificationMutation = useMutation({
    mutationFn: async (placeId: string) => {
      return apiRequest(`/api/merchants/${merchant.id}/verify/google`, {
        method: "POST",
        body: JSON.stringify({ placeId }),
      });
    },
    onSuccess: (data) => {
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      toast({
        title: data.success ? "Verification Successful" : "Verification Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      if (data.success) {
        setStep('overview');
      }
    },
    onError: () => {
      toast({
        title: "Verification Error",
        description: "Failed to verify Google My Business",
        variant: "destructive",
      });
    },
  });

  // Send phone verification code mutation
  const sendPhoneCodeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/merchants/${merchant.id}/verify/phone/send`, {
        method: "POST",
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Code Sent",
          description: "Verification code sent to your phone",
        });
        // Set timer to 10 minutes (600 seconds)
        setTimeLeft(600);
        setStep('phone');
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  // Verify phone code mutation
  const verifyPhoneCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest(`/api/merchants/${merchant.id}/verify/phone/confirm`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
    },
    onSuccess: (data) => {
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      toast({
        title: data.success ? "Phone Verified" : "Verification Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      if (data.success) {
        setPhoneCode("");
        setTimeLeft(0);
        setStep('overview');
      }
    },
    onError: () => {
      toast({
        title: "Verification Error",
        description: "Failed to verify phone code",
        variant: "destructive",
      });
    },
  });

  const handleGoogleVerification = () => {
    if (merchant.googlePlaceId) {
      googleVerificationMutation.mutate(merchant.googlePlaceId);
    } else {
      toast({
        title: "Missing Google Place ID",
        description: "Please edit your location to search and select your business from Google Places",
        variant: "destructive",
      });
    }
  };

  const handleSendPhoneCode = () => {
    if (!merchant.phone) {
      toast({
        title: "Phone Number Required",
        description: "Please add a phone number to your business location first",
        variant: "destructive",
      });
      return;
    }
    sendPhoneCodeMutation.mutate();
  };

  const handleVerifyPhoneCode = () => {
    if (!phoneCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }
    verifyPhoneCodeMutation.mutate(phoneCode.trim());
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderOverviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-blue-500" />
        <h3 className="text-lg font-semibold mb-2">Business Verification</h3>
        <p className="text-gray-600 text-sm">
          Verify your business to build trust with customers and unlock premium features
        </p>
      </div>

      <div className="space-y-4">
        {/* Google My Business Verification */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5" />
              Google My Business
              {verificationStatus?.googleMyBusinessVerified ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-600 mb-4">
              We'll verify your business matches Google's records by comparing your business name and contact information.
            </p>
            {!verificationStatus?.googleMyBusinessVerified ? (
              <Button 
                onClick={handleGoogleVerification}
                disabled={googleVerificationMutation.isPending || !verificationStatus?.hasGooglePlaceId}
                className="w-full"
              >
                {googleVerificationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify with Google'
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Google verification completed
              </div>
            )}
            {!verificationStatus?.hasGooglePlaceId && (
              <Alert className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please edit your location and search for your business to get the Google Place ID first.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Phone Verification */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-5 w-5" />
              Phone Number
              {verificationStatus?.phoneVerified ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-600 mb-4">
              We'll send a verification code to your business phone number to confirm you have access to it.
            </p>
            {verificationStatus?.hasPhone ? (
              <p className="text-sm text-gray-500 mb-4">
                Phone: {merchant.phone}
              </p>
            ) : null}
            {!verificationStatus?.phoneVerified ? (
              <Button 
                onClick={handleSendPhoneCode}
                disabled={sendPhoneCodeMutation.isPending || !verificationStatus?.hasPhone}
                className="w-full"
                variant="outline"
              >
                {sendPhoneCodeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Phone verification completed
              </div>
            )}
            {!verificationStatus?.hasPhone && (
              <Alert className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please add a phone number to your business location first.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overall Status */}
      {verificationStatus?.verificationStatus === 'verified' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Business Verified!</strong> Your business has been successfully verified. 
            Customers will see a verification badge on your deals.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderPhoneStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Phone className="h-12 w-12 mx-auto mb-4 text-blue-500" />
        <h3 className="text-lg font-semibold mb-2">Phone Verification</h3>
        <p className="text-gray-600 text-sm">
          Enter the 6-digit code sent to {merchant.phone}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="verification-code">Verification Code</Label>
          <Input
            id="verification-code"
            type="text"
            placeholder="123456"
            value={phoneCode}
            onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-lg tracking-widest"
            maxLength={6}
            data-testid="input-verification-code"
          />
        </div>

        {timeLeft > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            Code expires in {formatTime(timeLeft)}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleVerifyPhoneCode}
            disabled={verifyPhoneCodeMutation.isPending || phoneCode.length !== 6}
            className="flex-1"
            data-testid="button-verify-code"
          >
            {verifyPhoneCodeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>
          <Button
            onClick={handleSendPhoneCode}
            disabled={sendPhoneCodeMutation.isPending || timeLeft > 540} // Allow resend after 1 minute
            variant="outline"
            data-testid="button-resend-code"
          >
            {sendPhoneCodeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Button
          onClick={() => setStep('overview')}
          variant="ghost"
          className="w-full"
        >
          Back to Overview
        </Button>
      </div>
    </div>
  );

  if (statusLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Verify {merchant?.name}
          </DialogTitle>
          <DialogDescription>
            Verify your business to build customer trust and unlock premium features
          </DialogDescription>
        </DialogHeader>

        {step === 'overview' && renderOverviewStep()}
        {step === 'phone' && renderPhoneStep()}
      </DialogContent>
    </Dialog>
  );
}