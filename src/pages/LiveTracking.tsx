import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Clock } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const LiveTracking = () => {
  const { walkId } = useParams();
  const [walkData, setWalkData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!walkId) return;

    fetchWalkData();
    subscribeToLocationUpdates();
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
        initializeMap(location.latitude, location.longitude);
        setLastUpdate(new Date(location.timestamp));
      }
    } catch (error) {
      console.error("Error fetching walk data:", error);
    }
  };

  const initializeMap = (lat: number, lng: number) => {
    if (!mapContainer.current) return;

    // Note: In production, you'll need to add your Mapbox token
    // For now, we'll show a placeholder
    mapContainer.current.innerHTML = `
      <div class="w-full h-full bg-muted flex items-center justify-center rounded-lg">
        <div class="text-center space-y-2">
          <MapPin class="w-12 h-12 text-primary mx-auto" />
          <p class="text-sm text-muted-foreground">
            Ubicación: ${lat.toFixed(6)}, ${lng.toFixed(6)}
          </p>
          <p class="text-xs text-muted-foreground">
            Agrega tu token de Mapbox para ver el mapa completo
          </p>
        </div>
      </div>
    `;
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
          updateMapLocation(location.latitude, location.longitude);
          setLastUpdate(new Date(location.timestamp));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateMapLocation = (lat: number, lng: number) => {
    if (map.current) {
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      }
      map.current.flyTo({ center: [lng, lat], zoom: 15 });
    }
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
            <div ref={mapContainer} className="w-full h-[500px]" />
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>
                El mapa se actualiza automáticamente cada vez que el paseador se mueve
              </span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LiveTracking;
