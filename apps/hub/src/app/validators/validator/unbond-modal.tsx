import { useState } from "react";
import { UserValidator } from "@bera/berajs";
import { Button } from "@bera/ui/button";
import { Dialog, DialogContent } from "@bera/ui/dialog";

import { UnDelegateContent } from "./undelegate-content";

export const UnbondModal = ({
  userValidator,
  setIsValidatorDataLoading,
}: {
  userValidator: UserValidator;
  setIsValidatorDataLoading: (loading: boolean) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        disabled={Number(userValidator.amountDeposited) <= 0}
      >
        Unboost
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full md:w-[550px]">
          <UnDelegateContent
            setIsValidatorDataLoading={setIsValidatorDataLoading}
            userValidator={userValidator}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
