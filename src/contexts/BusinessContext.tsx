import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface BusinessContextType {
  businessId: string | null;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  saveExchangeRate: () => Promise<void>;
  loading: boolean;
  userRole: string;
  switchBusiness: (id: string) => void;
}

const BusinessContext = createContext<BusinessContextType>({
  businessId: null,
  exchangeRate: 18,
  setExchangeRate: () => {},
  saveExchangeRate: async () => {},
  loading: true,
  userRole: "admin",
  switchBusiness: () => {},
});

export const useBusiness = () => useContext(BusinessContext);

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState(16);
  const [userRole, setUserRole] = useState("admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBusinessId(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("business_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      let activeBizId = data?.business_id || null;
      let role = data?.role || "admin";

      // If no business from profile, check business_members
      if (!activeBizId) {
        const { data: memberships } = await supabase
          .from("business_members")
          .select("business_id, role")
          .eq("user_id", user.id)
          .limit(1);
        if (memberships && memberships.length > 0) {
          activeBizId = memberships[0].business_id;
          role = memberships[0].role || "member";
          // Also update profile so future loads are faster
          await supabase
            .from("profiles")
            .update({ business_id: activeBizId, role })
            .eq("user_id", user.id);
        }
      }

      if (activeBizId) {
        setBusinessId(activeBizId);
        setUserRole(role);

        const { data: biz } = await supabase
          .from("businesses")
          .select("exchange_rate")
          .eq("id", activeBizId)
          .maybeSingle();

        if (biz?.exchange_rate) {
          setExchangeRate(Number(biz.exchange_rate));
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const switchBusiness = async (id: string) => {
    setBusinessId(id);
    const { data: biz } = await supabase
      .from("businesses")
      .select("exchange_rate")
      .eq("id", id)
      .maybeSingle();
    if (biz?.exchange_rate) {
      setExchangeRate(Number(biz.exchange_rate));
    }
  };

  const saveExchangeRate = async () => {
    if (!businessId) return;
    await supabase
      .from("businesses")
      .update({ exchange_rate: exchangeRate })
      .eq("id", businessId);
  };

  return (
    <BusinessContext.Provider value={{ businessId, exchangeRate, setExchangeRate, saveExchangeRate, loading, userRole, switchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
};
