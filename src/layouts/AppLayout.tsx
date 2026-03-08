import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";

const AppLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64 flex flex-col overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
