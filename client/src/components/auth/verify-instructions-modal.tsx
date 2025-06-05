import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VerifyInstructionsModalProps {
  email: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VerifyInstructionsModal({
  email,
  isOpen,
  onClose,
}: VerifyInstructionsModalProps) {
  const [, navigate] = useLocation();
  const [inputEmail, setInputEmail] = useState(email);

  useEffect(() => {
    setInputEmail(email);
  }, [email]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Your Account</DialogTitle>
          <DialogDescription>
            Please check your email at <strong>{email}</strong> for a 4-digit
            verification code. Enter this code on the verification page to
            activate your account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              navigate(`/verify?email=${encodeURIComponent(inputEmail)}`);
              onClose();
            }}
          >
            Go to Verification Page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
