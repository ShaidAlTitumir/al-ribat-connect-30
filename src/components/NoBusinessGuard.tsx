import { useNavigate } from "react-router-dom";
import { useBusiness } from "@/contexts/BusinessContext";

const NoBusinessGuard = ({ children }: { children: React.ReactNode }) => {
  const { businessId, loading } = useBusiness();
  const navigate = useNavigate();

  if (loading) return null;

  if (!businessId) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[40px] text-primary">storefront</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">No Business Yet</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You need to create a business or join an existing one before you can start managing sales, inventory, expenses and more.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/business")}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[20px]">add_business</span>
                Create a Business
              </span>
            </button>
            <button
              onClick={() => navigate("/join-business")}
              className="w-full h-12 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[20px]">group_add</span>
                Join a Business
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default NoBusinessGuard;
