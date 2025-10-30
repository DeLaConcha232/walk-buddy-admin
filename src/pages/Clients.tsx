import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Mail, Phone } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Clients = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Obtener afiliaciones del admin
      const { data: affiliations, error } = await supabase
        .from("affiliations")
        .select("id, user_id, affiliated_at")
        .eq("admin_id", user.id)
        .eq("is_active", true)
        .order("affiliated_at", { ascending: false });

      if (error) throw error;

      if (!affiliations || affiliations.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      // Obtener perfiles de los usuarios afiliados
      const userIds = affiliations.map(a => a.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, phone")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combinar datos
      const clientsData = affiliations.map(affiliation => {
        const profile = profiles?.find(p => p.id === affiliation.user_id);
        return {
          id: affiliation.id,
          affiliated_at: affiliation.affiliated_at,
          profiles: profile || { name: "Sin nombre", email: "Sin email", phone: "Sin teléfono" }
        };
      });

      setClients(clientsData);
    } catch (error) {
      // Error fetching clients
    } finally {
      setLoading(false);
    }
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
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Clientes Afiliados</h1>
                <p className="text-sm text-muted-foreground">Gestiona tus usuarios</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              {clients.length} cliente{clients.length !== 1 ? "s" : ""} registrado{clients.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay clientes afiliados aún
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Fecha de Afiliación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.profiles?.name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {client.profiles?.email || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {client.profiles?.phone || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(client.affiliated_at).toLocaleDateString("es-ES")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Clients;
