import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Square, Navigation, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TrackingControlsProps {
  userId: string;
  onMetricsUpdate: () => void;
}

const TrackingControls = ({ userId, onMetricsUpdate }: TrackingControlsProps) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [showQR, setShowQR] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if there's an active tracking session
    checkActiveSession();
  }, [userId]);

  const checkActiveSession = async () => {
    try {
      const { data: activeWalk } = await supabase
        .from("walks")
        .select("id")
        .eq("walker_id", userId)
        .eq("status", "active")
        .single();

      if (activeWalk) {
        setCurrentSessionId(activeWalk.id);
        setIsTracking(true);
        startLocationTracking(activeWalk.id);
      }
    } catch (error) {
      console.error("Error checking active session:", error);
    }
  };

  const startLocationTracking = (sessionId: string) => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS no disponible",
        description: "Tu dispositivo no soporta geolocalización",
        variant: "destructive",
      });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          await supabase.from("admin_locations").insert({
            admin_id: userId,
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
          });
          console.log("Location updated:", { latitude, longitude });
        } catch (error) {
          console.error("Error saving location:", error);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Error de GPS",
          description: "No se pudo obtener la ubicación",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    setWatchId(id);
  };

  const handleStartTracking = async () => {
    try {
      // Create a new walk session
      const { data: walk, error } = await supabase
        .from("walks")
        .insert({
          walker_id: userId,
          client_id: userId, // Self-assigned for admin tracking
          dog_name: "Sesión GPS",
          status: "active",
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Generate QR code
      const qrCode = `TRACK-${walk.id}`;
      const { data: qrData, error: qrError } = await supabase
        .from("qr_codes")
        .insert({
          code: qrCode,
          walk_id: walk.id,
          created_by: userId,
          is_active: true,
        })
        .select()
        .single();

      if (qrError) throw qrError;

      const trackingUrl = `${window.location.origin}/track/${walk.id}`;
      setQrUrl(trackingUrl);
      setCurrentSessionId(walk.id);
      setIsTracking(true);
      setShowQR(true);

      startLocationTracking(walk.id);
      onMetricsUpdate();

      toast({
        title: "Tracking iniciado",
        description: "Comparte el código QR con tus clientes",
      });
    } catch (error: any) {
      console.error("Error starting tracking:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo iniciar el tracking",
        variant: "destructive",
      });
    }
  };

  const handleStopTracking = async () => {
    if (!currentSessionId) return;

    try {
      // Stop geolocation watching
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }

      // Update walk status
      await supabase
        .from("walks")
        .update({
          status: "completed",
          end_time: new Date().toISOString(),
        })
        .eq("id", currentSessionId);

      // Deactivate QR code
      await supabase
        .from("qr_codes")
        .update({ is_active: false })
        .eq("walk_id", currentSessionId);

      setIsTracking(false);
      setCurrentSessionId(null);
      setShowQR(false);
      onMetricsUpdate();

      toast({
        title: "Tracking finalizado",
        description: "La sesión de GPS ha terminado",
      });
    } catch (error: any) {
      console.error("Error stopping tracking:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo detener el tracking",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Control de Tracking GPS
          </CardTitle>
          <CardDescription>
            {isTracking
              ? "Tracking activo - Los clientes pueden ver tu ubicación en tiempo real"
              : "Inicia una sesión para compartir tu ubicación con clientes"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {!isTracking ? (
              <Button
                variant="tracking"
                size="lg"
                onClick={handleStartTracking}
                className="flex-1"
              >
                <MapPin className="mr-2 h-5 w-5" />
                Iniciar Paseo
              </Button>
            ) : (
              <>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleStopTracking}
                  className="flex-1"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Finalizar Paseo
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowQR(true)}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Ver QR
                </Button>
              </>
            )}
          </div>

          {isTracking && (
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm font-medium text-success-foreground">
                GPS Activo - Ubicación compartida en tiempo real
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código QR - Tracking en Vivo</DialogTitle>
            <DialogDescription>
              Los clientes pueden escanear este código para ver tu ubicación
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrUrl && (
              <div className="bg-white p-4 rounded-lg shadow-md">
                <QRCodeSVG value={qrUrl} size={256} level="H" />
              </div>
            )}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">URL del tracking:</p>
              <code className="text-xs bg-muted px-3 py-1 rounded">
                {qrUrl}
              </code>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrackingControls;
