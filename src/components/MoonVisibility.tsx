import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import * as SunCalc from 'suncalc';

interface MoonData {
  isVisible: boolean;
  altitude: number;
  azimuth: number;
  phase: number;
  illumination: number;
  rise: Date | null;
  set: Date | null;
}

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

const MoonVisibility = () => {
  const [moonData, setMoonData] = useState<MoonData | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const getMoonPhaseDescription = (phase: number): string => {
    if (phase < 0.03 || phase > 0.97) return 'New Moon';
    if (phase < 0.22) return 'Waxing Crescent';
    if (phase < 0.28) return 'First Quarter';
    if (phase < 0.47) return 'Waxing Gibbous';
    if (phase < 0.53) return 'Full Moon';
    if (phase < 0.72) return 'Waning Gibbous';
    if (phase < 0.78) return 'Last Quarter';
    return 'Waning Crescent';
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDegrees = (degrees: number): string => {
    return `${Math.round(degrees)}°`;
  };

  const getAzimuthDirection = (azimuth: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(azimuth / 22.5) % 16;
    return directions[index];
  };

  const calculateMoonData = (lat: number, lng: number): MoonData => {
    const now = new Date();
    const moonPosition = SunCalc.getMoonPosition(now, lat, lng);
    const moonIllumination = SunCalc.getMoonIllumination(now);
    const moonTimes = SunCalc.getMoonTimes(now, lat, lng);

    // Convert altitude from radians to degrees
    const altitudeDegrees = moonPosition.altitude * (180 / Math.PI);
    const azimuthDegrees = moonPosition.azimuth * (180 / Math.PI);

    // Convert from SunCalc's south-based azimuth (0° = South) to standard north-based azimuth (0° = North)
    // and normalize to 0-360 degrees
    const normalizedAzimuth = (azimuthDegrees + 180) % 360;

    // Moon is visible if it's above the horizon (altitude > 0)
    const isVisible = altitudeDegrees > 0;

    return {
      isVisible,
      altitude: altitudeDegrees,
      azimuth: normalizedAzimuth,
      phase: moonIllumination.phase,
      illumination: moonIllumination.fraction,
      rise: moonTimes.rise,
      set: moonTimes.set
    };
  };

  const getCurrentLocation = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Try to get city name from reverse geocoding
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            resolve({
              latitude,
              longitude,
              city: data.city || data.locality || 'Unknown Location'
            });
          } catch {
            resolve({ latitude, longitude });
          }
        },
        (error) => {
          reject(new Error(`Location error: ${error.message}`));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  };

  const updateMoonData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const locationData = location || await getCurrentLocation();
      if (!location) setLocation(locationData);
      
      const data = calculateMoonData(locationData.latitude, locationData.longitude);
      setMoonData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get moon data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateMoonData();
  }, []);

  useEffect(() => {
    const interval = setInterval(updateMoonData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-star border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Calculating moon position...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space to-background flex items-center justify-center">
        <Card className="max-w-md mx-4 bg-card/50 backdrop-blur border-border">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={updateMoonData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!moonData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-space to-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-light text-muted-foreground">Can you see the moon?</h1>
          {location?.city && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{location.city}</span>
            </div>
          )}
        </div>

        {/* Main Answer */}
        <Card className="bg-card/30 backdrop-blur border-border/50 overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                {moonData.isVisible ? (
                  <Eye className="w-8 h-8 text-visible" />
                ) : (
                  <EyeOff className="w-8 h-8 text-hidden" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className={`text-6xl font-bold ${moonData.isVisible ? 'text-visible' : 'text-hidden'}`}>
                  {moonData.isVisible ? 'YES' : 'NO'}
                </div>
                <p className="text-xl text-muted-foreground">
                  The moon is {moonData.isVisible ? 'above' : 'below'} the horizon
                </p>
              </div>

              <div className="pt-4">
                <Button
                  onClick={updateMoonData}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Moon Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Phase */}
          <Card className="bg-card/20 backdrop-blur border-border/50">
            <CardContent className="p-4 text-center space-y-2">
              <div className="text-2xl">🌙</div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Moon Phase</div>
                <div className="font-semibold">{getMoonPhaseDescription(moonData.phase)}</div>
                <div className="text-sm text-muted-foreground">
                  {Math.round(moonData.illumination * 100)}% illuminated
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Position */}
          <Card className="bg-card/20 backdrop-blur border-border/50">
            <CardContent className="p-4 text-center space-y-2">
              <div className="text-2xl">📍</div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Position</div>
                <div className="font-semibold">
                  {formatDegrees(moonData.altitude)} alt
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDegrees(moonData.azimuth)} {getAzimuthDirection(moonData.azimuth)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Moonrise */}
          <Card className="bg-card/20 backdrop-blur border-border/50">
            <CardContent className="p-4 text-center space-y-2">
              <div className="text-2xl">🌅</div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Moonrise</div>
                <div className="font-semibold">{formatTime(moonData.rise)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Moonset */}
          <Card className="bg-card/20 backdrop-blur border-border/50">
            <CardContent className="p-4 text-center space-y-2">
              <div className="text-2xl">🌇</div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Moonset</div>
                <div className="font-semibold">{formatTime(moonData.set)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Updated */}
        <div className="text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Last updated: {formatTime(lastUpdated)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoonVisibility;