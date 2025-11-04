import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dog, Users, MapPin, Activity, LogOut, Navigation, QrCode } from "lucide-react";
import TrackingControls from "@/components/TrackingControls";
import MetricsCard from "@/components/MetricsCard";
import AdminQRCode from "@/components/AdminQRCode";
import { useUserRole } from "@/hooks/useUserRole";

const Dashboard = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    activeWalks: 0,
    todayWalks: 0,
    totalWalks: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchMetrics(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchMetrics = async (userId: string) => {
    try {
      // Get total affiliated clients
      const { count: clientsCount } = await supabase
        .from("affiliations")
        .select("*", { count: "exact", head: true })
        .eq("admin_id", userId)
        .eq("is_active", true);

      // Get active walks
      const { count: activeCount } = await supabase
        .from("walks")
        .select("*", { count: "exact", head: true })
        .eq("walker_id", userId)
        .eq("status", "active");

      // Get today's walks
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from("walks")
        .select("*", { count: "exact", head: true })
        .eq("walker_id", userId)
        .gte("created_at", today.toISOString());

      // Get total walks
      const { count: totalCount } = await supabase
        .from("walks")
        .select("*", { count: "exact", head: true })
        .eq("walker_id", userId);

      setMetrics({
        totalClients: clientsCount || 0,
        activeWalks: activeCount || 0,
        todayWalks: todayCount || 0,
        totalWalks: totalCount || 0,
      });
    } catch (error) {
      // Error fetching metrics
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || roleLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Activity className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-primary rounded-full p-2 shadow-glow">
                <Dog className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Walk Buddy Admin</h1>
                <p className="text-sm text-muted-foreground">Panel de Control</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* QR Code y Tracking Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminQRCode adminId={user?.id} />
          <TrackingControls userId={user?.id} onMetricsUpdate={() => fetchMetrics(user?.id)} />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="Clientes Activos"
            value={metrics.totalClients}
            icon={Users}
            color="primary"
          />
          <MetricsCard
            title="Paseos Activos"
            value={metrics.activeWalks}
            icon={Navigation}
            color="success"
          />
          <MetricsCard
            title="Paseos Hoy"
            value={metrics.todayWalks}
            icon={MapPin}
            color="accent"
          />
          <MetricsCard
            title="Total Paseos"
            value={metrics.totalWalks}
            icon={Activity}
            color="muted"
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Gestiona tu negocio desde aquí</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="justify-start h-auto py-4"
              onClick={() => navigate("/clients")}
            >
              <Users className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Ver Clientes</div>
                <div className="text-xs text-muted-foreground">Gestionar usuarios afiliados</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="justify-start h-auto py-4"
              onClick={() => navigate("/walks")}
            >
              <Activity className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Historial de Paseos</div>
                <div className="text-xs text-muted-foreground">Ver paseos completados</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
