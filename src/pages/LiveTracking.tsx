import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Clock } from "lucide-react";
import LiveMap from "@/components/LiveMap";

const LiveTracking = () => {
  const { walkId } = useParams();
  const [walkData, setWalkData] = useState<any>(null);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!walkId) return;

    fetchWalkData();
    const unsubscribe = subscribeToLocationUpdates();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [walkId]);

  const fetchWalkData = async () => {
    try {
      const { data } = await supabase
        .from("walks")
        .select("*, profiles!walks_walker_id_fkey(name)")
        .eq("id", walkId)
        .single();

      setWalkData(data);
      
      // Get latest location
      const { data: location } = await supabase
        .from("admin_locations")
        .select("*")
        .eq("admin_id", data.walker_id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      if (location) {
        const lat = Number(location.latitude);
        const lng = Number(location.longitude);
        setCurrentPosition([lat, lng]);
        setLastUpdate(new Date(location.timestamp));
      }
    } catch (error) {
      console.error("Error fetching walk data:", error);
    }
  };

  const subscribeToLocationUpdates = () => {
    const channel = supabase
      .channel("location-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_locations",
        },
        (payload) => {
          const location = payload.new;
          const lat = Number(location.latitude);
          const lng = Number(location.longitude);
          setCurrentPosition([lat, lng]);
          setLastUpdate(new Date(location.timestamp));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="bg-card border-b sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-primary rounded-full p-2 shadow-glow">
              <Navigation className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tracking en Vivo</h1>
              <p className="text-sm text-muted-foreground">
                {walkData?.profiles?.name || "Cargando..."}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              Paseo Activo
            </CardTitle>
            <CardDescription>
              {lastUpdate && (
                <div className="flex items-center gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  Última actualización: {lastUpdate.toLocaleTimeString("es-ES")}
                </div>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Map Container */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {currentPosition ? (
              <LiveMap 
                position={currentPosition}
                walkerName={walkData?.profiles?.name}
                dogName={walkData?.dog_name}
                lastUpdate={lastUpdate || undefined}
              />
            ) : (
              <div className="w-full h-[500px] bg-muted flex items-center justify-center">
                <div className="text-center space-y-2">
                  <MapPin className="w-12 h-12 text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Esperando ubicación del paseador...
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>
                El mapa se actualiza automáticamente usando OpenStreetMap
              </span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LiveTracking;
