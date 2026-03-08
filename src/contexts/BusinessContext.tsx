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
  exchangeRate: 16,
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

      if (data?.business_id) {
        setBusinessId(data.business_id);
        setUserRole(data.role || "admin");

        const { data: biz } = await supabase
          .from("businesses")
          .select("exchange_rate")
          .eq("id", data.business_id)
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
