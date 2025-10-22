import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Eye, EyeOff, RefreshCw, Moon, Sunrise, Sunset, Compass, Navigation, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as SunCalc from 'suncalc';

const MAJOR_CITIES = [
  { name: 'Current Location', latitude: 0, longitude: 0, value: 'current' },
  { name: 'London, UK', latitude: 51.5074, longitude: -0.1278, value: 'london' },
  { name: 'New York, USA', latitude: 40.7128, longitude: -74.0060, value: 'newyork' },
  { name: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503, value: 'tokyo' },
  { name: 'Paris, France', latitude: 48.8566, longitude: 2.3522, value: 'paris' },
  { name: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093, value: 'sydney' },
  { name: 'Dubai, UAE', latitude: 25.2048, longitude: 55.2708, value: 'dubai' },
  { name: 'Singapore', latitude: 1.3521, longitude: 103.8198, value: 'singapore' },
  { name: 'Hong Kong', latitude: 22.3193, longitude: 114.1694, value: 'hongkong' },
  { name: 'Mumbai, India', latitude: 19.0760, longitude: 72.8777, value: 'mumbai' },
  { name: 'São Paulo, Brazil', latitude: -23.5505, longitude: -46.6333, value: 'saopaulo' },
  { name: 'Cairo, Egypt', latitude: 30.0444, longitude: 31.2357, value: 'cairo' },
  { name: 'Moscow, Russia', latitude: 55.7558, longitude: 37.6173, value: 'moscow' },
  { name: 'Los Angeles, USA', latitude: 34.0522, longitude: -118.2437, value: 'losangeles' },
  { name: 'Berlin, Germany', latitude: 52.5200, longitude: 13.4050, value: 'berlin' },
  { name: 'Toronto, Canada', latitude: 43.6532, longitude: -79.3832, value: 'toronto' },
  { name: 'Mexico City, Mexico', latitude: 19.4326, longitude: -99.1332, value: 'mexicocity' },
  { name: 'Beijing, China', latitude: 39.9042, longitude: 116.4074, value: 'beijing' },
  { name: 'Bangkok, Thailand', latitude: 13.7563, longitude: 100.5018, value: 'bangkok' },
  { name: 'Istanbul, Turkey', latitude: 41.0082, longitude: 28.9784, value: 'istanbul' },
];

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
  const [isCurrentLocation, setIsCurrentLocation] = useState(true);
  const [selectedCity, setSelectedCity] = useState('current');
  const [openDialog, setOpenDialog] = useState<'phase' | 'position' | 'rise' | 'set' | null>(null);

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

  const handleCityChange = async (value: string) => {
    setSelectedCity(value);
    setLoading(true);
    setError(null);
    
    try {
      if (value === 'current') {
        const locationData = await getCurrentLocation();
        setLocation(locationData);
        setIsCurrentLocation(true);
        const data = calculateMoonData(locationData.latitude, locationData.longitude);
        setMoonData(data);
      } else {
        const city = MAJOR_CITIES.find(c => c.value === value);
        if (city) {
          setLocation({ latitude: city.latitude, longitude: city.longitude, city: city.name });
          setIsCurrentLocation(false);
          const data = calculateMoonData(city.latitude, city.longitude);
          setMoonData(data);
        }
      }
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get moon data');
    } finally {
      setLoading(false);
    }
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
            <div className="flex items-center justify-center">
              <Select value={selectedCity} onValueChange={handleCityChange}>
                <SelectTrigger className="w-auto border-none bg-transparent hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {isCurrentLocation ? (
                      <Navigation className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {MAJOR_CITIES.map((city) => (
                    <SelectItem key={city.value} value={city.value}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <EyeOff className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className={`text-6xl font-bold font-doto ${moonData.isVisible ? 'text-visible' : 'text-muted-foreground'}`}>
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
          <Card 
            className="bg-card/20 backdrop-blur border-border/50 cursor-pointer hover:bg-card/30 transition-colors"
            onClick={() => setOpenDialog('phase')}
          >
            <CardContent className="p-4 text-center space-y-2">
              <Moon className="w-8 h-8 mx-auto text-muted-foreground" />
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
          <Card 
            className="bg-card/20 backdrop-blur border-border/50 cursor-pointer hover:bg-card/30 transition-colors"
            onClick={() => setOpenDialog('position')}
          >
            <CardContent className="p-4 text-center space-y-2">
              <Compass className="w-8 h-8 mx-auto text-muted-foreground" />
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
          <Card 
            className="bg-card/20 backdrop-blur border-border/50 cursor-pointer hover:bg-card/30 transition-colors"
            onClick={() => setOpenDialog('rise')}
          >
            <CardContent className="p-4 text-center space-y-2">
              <Sunrise className="w-8 h-8 mx-auto text-muted-foreground" />
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Moonrise</div>
                <div className="font-semibold">{formatTime(moonData.rise)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Moonset */}
          <Card 
            className="bg-card/20 backdrop-blur border-border/50 cursor-pointer hover:bg-card/30 transition-colors"
            onClick={() => setOpenDialog('set')}
          >
            <CardContent className="p-4 text-center space-y-2">
              <Sunset className="w-8 h-8 mx-auto text-muted-foreground" />
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Moonset</div>
                <div className="font-semibold">{formatTime(moonData.set)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail Dialogs */}
        <Dialog open={openDialog === 'phase'} onOpenChange={() => setOpenDialog(null)}>
          <DialogContent className="bg-card/95 backdrop-blur border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                Moon Phase Details
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {/* Content will be added later */}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openDialog === 'position'} onOpenChange={() => setOpenDialog(null)}>
          <DialogContent className="bg-card/95 backdrop-blur border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Compass className="w-5 h-5" />
                Position Details
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {/* Content will be added later */}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openDialog === 'rise'} onOpenChange={() => setOpenDialog(null)}>
          <DialogContent className="bg-card/95 backdrop-blur border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sunrise className="w-5 h-5" />
                Moonrise Details
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {/* Content will be added later */}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openDialog === 'set'} onOpenChange={() => setOpenDialog(null)}>
          <DialogContent className="bg-card/95 backdrop-blur border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sunset className="w-5 h-5" />
                Moonset Details
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {/* Content will be added later */}
            </div>
          </DialogContent>
        </Dialog>

        {/* Last Updated */}
        <div className="text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Last updated: {formatTime(lastUpdated)}</span>
          </div>
        </div>

        {/* Buy Me a Coffee */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <a 
            href="https://buymeacoffee.com/jamieharrington" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button 
              variant="outline" 
              className="bg-card/20 backdrop-blur border-border/50 hover:bg-card/30"
            >
              Buy me a coffee
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default MoonVisibility;