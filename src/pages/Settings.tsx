import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    email: true,
    whatsapp: true,
    monthly: false,
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 lg:px-8 sticky top-0 z-10">
        <h2 className="text-lg font-bold text-foreground">Settings</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Rate:</label>
            <input className="w-16 h-9 rounded-lg border border-border bg-muted text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground px-2" type="number" defaultValue={16} />
            <button className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">Save</button>
          </div>
        </div>
      </header>

      <div className="p-6 lg:p-8 max-w-[800px] w-full mx-auto space-y-6">
        {/* Profile Information */}
        <section className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
          <div className="p-6 flex items-center gap-3 border-b border-border">
            <span className="material-symbols-outlined text-primary">account_circle</span>
            <h3 className="font-bold text-lg text-foreground">Profile Information</h3>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="relative w-24 h-24 shrink-0 mx-auto md:mx-0">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary text-3xl font-bold border-4 border-muted">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full border-2 border-card shadow-lg hover:bg-primary/90">
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                </button>
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-muted-foreground">Full Name</label>
                    <input className="w-full h-11 rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary px-4 text-foreground" type="text" placeholder="Your name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-muted-foreground">Phone Number</label>
                    <input className="w-full h-11 rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary px-4 text-foreground" type="tel" placeholder="+880 1712-345678" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-muted-foreground">Email Address</label>
                  <input className="w-full h-11 rounded-lg border border-border bg-muted focus:ring-2 focus:ring-primary/20 px-4 text-muted-foreground" type="email" value={user?.email || ""} readOnly />
                </div>
                <div className="flex justify-end pt-2">
                  <button className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-opacity">Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-card rounded-xl shadow-card border border-border">
          <div className="p-6 flex items-center gap-3 border-b border-border">
            <span className="material-symbols-outlined text-primary">lock</span>
            <h3 className="font-bold text-lg text-foreground">Security</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Current Password</label>
              <input className="w-full h-11 rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary/20 px-4 text-foreground" placeholder="••••••••" type="password" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-muted-foreground">New Password</label>
                <input className="w-full h-11 rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary/20 px-4 text-foreground" placeholder="••••••••" type="password" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-muted-foreground">Confirm New Password</label>
                <input className="w-full h-11 rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary/20 px-4 text-foreground" placeholder="••••••••" type="password" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-opacity">Update Password</button>
            </div>
          </div>
        </section>

        {/* Business Settings */}
        <section className="bg-card rounded-xl shadow-card border border-border">
          <div className="p-6 flex items-center gap-3 border-b border-border">
            <span className="material-symbols-outlined text-primary">business_center</span>
            <h3 className="font-bold text-lg text-foreground">Business Settings</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Business Name</label>
              <input className="w-full h-11 rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary/20 px-4 text-foreground" type="text" placeholder="Al-Ribat International" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Business Address</label>
              <textarea className="w-full rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary/20 px-4 py-2 text-foreground" rows={3} placeholder="Suite 402, Trade Center, Dhaka 1212, Bangladesh" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-muted-foreground">Primary Currency</label>
                <select className="w-full h-11 rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary/20 px-4 text-foreground">
                  <option>BDT (Taka)</option>
                  <option>RMB (Yuan)</option>
                  <option>USD (Dollar)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-muted-foreground">Exchange Rate Alert (%)</label>
                <input className="w-full h-11 rounded-lg border border-border bg-card focus:ring-2 focus:ring-primary/20 px-4 text-foreground" type="number" defaultValue={2.5} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-opacity">Save Business Settings</button>
            </div>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="bg-card rounded-xl shadow-card border border-border">
          <div className="p-6 flex items-center gap-3 border-b border-border">
            <span className="material-symbols-outlined text-primary">notifications</span>
            <h3 className="font-bold text-lg text-foreground">Notification Preferences</h3>
          </div>
          <div className="p-6 space-y-6">
            {[
              { key: "email" as const, title: "Email Notifications", desc: "Receive summaries of new orders and invoices via email." },
              { key: "whatsapp" as const, title: "WhatsApp Alerts", desc: "Real-time alerts for due collections and late payments." },
              { key: "monthly" as const, title: "Monthly Reports", desc: "Comprehensive PDF reports sent on the 1st of every month." },
            ].map((n) => (
              <div key={n.key} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.desc}</p>
                </div>
                <button
                  onClick={() => setNotifications((prev) => ({ ...prev, [n.key]: !prev[n.key] }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications[n.key] ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${notifications[n.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-card rounded-xl shadow-card border border-destructive/30 overflow-hidden">
          <div className="p-6 bg-destructive/5 flex items-center gap-3 border-b border-destructive/20">
            <span className="material-symbols-outlined text-destructive">report_problem</span>
            <h3 className="font-bold text-lg text-destructive">Danger Zone</h3>
          </div>
          <div className="p-6 flex items-center justify-between gap-6">
            <div className="flex-1">
              <p className="font-bold text-foreground">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your profile and all associated business data. This action cannot be undone.</p>
            </div>
            <button className="px-6 py-2.5 border-2 border-destructive/30 text-destructive font-bold rounded-lg hover:bg-destructive/5 transition-colors whitespace-nowrap">
              Delete Account
            </button>
          </div>
        </section>

        <footer className="pt-8 text-center text-muted-foreground text-sm">
          <p>© 2024 Al-Ribat International. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Settings;
