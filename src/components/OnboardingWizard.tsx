import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: "celebration",
    title: "Welcome to Al-Ribat Manager!",
    subtitle: "Your business is ready. Let's take a quick tour of what you can do.",
    features: [
      { icon: "rocket_launch", text: "Manage inventory, sales, and expenses" },
      { icon: "group", text: "Invite partners and share profits" },
      { icon: "bar_chart", text: "Track performance with smart reports" },
    ],
  },
  {
    icon: "inventory_2",
    title: "Stock Your Inventory",
    subtitle: "Add your products with purchase costs, weights, and selling prices. The system auto-calculates landed costs and profit margins.",
    tip: "Go to Inventory → Add Item to get started.",
    navPath: "/inventory",
    navLabel: "Go to Inventory",
  },
  {
    icon: "point_of_sale",
    title: "Record Your Sales",
    subtitle: "Log every sale with customer details, quantities, and payments. Track dues and profits automatically.",
    tip: "Go to Sales → New Sale to record your first transaction.",
    navPath: "/sales",
    navLabel: "Go to Sales",
  },
  {
    icon: "account_balance_wallet",
    title: "Track Expenses",
    subtitle: "Keep all your business expenses organized by category. See exactly where your money goes.",
    tip: "Go to Expenses → Add Expense to start tracking.",
    navPath: "/expenses",
    navLabel: "Go to Expenses",
  },
  {
    icon: "insights",
    title: "You're All Set!",
    subtitle: "Your dashboard will show KPIs, charts, and recent activity as you add data. Start by adding your first inventory item!",
    features: [
      { icon: "lightbulb", text: "Tip: Set your exchange rate from the home page" },
      { icon: "lightbulb", text: "Tip: Add customers to track who owes you" },
      { icon: "lightbulb", text: "Tip: Use Reports for detailed profit analysis" },
    ],
  },
];

const OnboardingWizard = ({ open, onClose }: OnboardingWizardProps) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { businessName, isSolo } = useBusiness();
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const handleNext = () => {
    if (isLast) {
      onClose();
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => Math.max(0, s - 1));

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-border rounded-2xl">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isFirst || isLast ? "bg-primary/10" : "bg-accent/10"}`}>
              <span
                className="material-symbols-outlined text-[36px] text-primary"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
              >
                {current.icon}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">{current.title}</h2>
            {isFirst && businessName && (
              <p className="text-sm font-medium text-primary">{businessName}</p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">{current.subtitle}</p>
          </div>

          {/* Features list */}
          {current.features && (
            <div className="space-y-3">
              {current.features.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <span className="material-symbols-outlined text-[20px] text-primary mt-0.5 shrink-0">{f.icon}</span>
                  <p className="text-sm text-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          {current.tip && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <span className="material-symbols-outlined text-[20px] text-primary mt-0.5 shrink-0">tips_and_updates</span>
              <p className="text-sm text-foreground">{current.tip}</p>
            </div>
          )}

          {/* Navigation shortcut */}
          {current.navPath && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleNavigate(current.navPath!)}
            >
              <span className="material-symbols-outlined text-[18px] mr-1">{current.icon}</span>
              {current.navLabel}
            </Button>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {!isFirst ? (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <span className="material-symbols-outlined text-[18px] mr-1">arrow_back</span>
                Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
                Skip
              </Button>
            )}

            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === step ? "bg-primary w-5" : i < step ? "bg-primary/40" : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>

            <Button size="sm" onClick={handleNext}>
              {isLast ? "Get Started" : "Next"}
              {!isLast && <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;
