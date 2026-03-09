import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";

const NoBusinessGuard = ({ children }: { children: ReactNode }) => {
  const { businessId, loading } = useBusiness();
  const navigate = useNavigate();

  if (loading) return null;

  if (!businessId) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-primary">store</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">No Business Yet</h2>
          <p className="text-muted-foreground text-sm">
            Create or join a business to start managing your inventory, sales, and expenses.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button onClick={() => navigate("/business")} className="gap-2">
              <span className="material-symbols-outlined text-lg">add_business</span>
              Create a Business
            </Button>
            <Button variant="outline" onClick={() => navigate("/join-business")} className="gap-2">
              <span className="material-symbols-outlined text-lg">group_add</span>
              Join a Business
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default NoBusinessGuard;
