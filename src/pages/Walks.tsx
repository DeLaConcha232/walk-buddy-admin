import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, Clock, MapPin } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Walks = () => {
  const [walks, setWalks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWalks();
  }, []);

  const fetchWalks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data } = await supabase
        .from("walks")
        .select(`
          *,
          profiles!walks_client_id_fkey(name)
        `)
        .eq("walker_id", user.id)
        .order("created_at", { ascending: false });

      setWalks(data || []);
    } catch (error) {
      console.error("Error fetching walks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      active: "default",
      completed: "secondary",
      cancelled: "destructive",
      pending: "outline",
    };

    const labels: any = {
      active: "Activo",
      completed: "Completado",
      cancelled: "Cancelado",
      pending: "Pendiente",
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const calculateDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "N/A";
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    return `${minutes} min`;
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="bg-card border-b sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-primary rounded-full p-2 shadow-glow">
                <Activity className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Historial de Paseos</h1>
                <p className="text-sm text-muted-foreground">Todos tus paseos registrados</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Lista de Paseos</CardTitle>
            <CardDescription>
              {walks.length} paseo{walks.length !== 1 ? "s" : ""} registrado{walks.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : walks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay paseos registrados aún
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Perro</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {walks.map((walk) => (
                      <TableRow key={walk.id}>
                        <TableCell className="font-medium">
                          {walk.profiles?.name || "N/A"}
                        </TableCell>
                        <TableCell>{walk.dog_name}</TableCell>
                        <TableCell>{getStatusBadge(walk.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {walk.start_time
                              ? new Date(walk.start_time).toLocaleString("es-ES", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })
                              : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {calculateDuration(walk.start_time, walk.end_time)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {walk.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Walks;
