import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Eye, EyeOff, RefreshCw, Moon, Sunrise, Sunset, Compass, Navigation, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as SunCalc from 'suncalc';
import { 
  WiMoonNew, 
  WiMoonWaxingCrescent3, 
  WiMoonFirstQuarter, 
  WiMoonWaxingGibbous3,
  WiMoonFull, 
  WiMoonWaningGibbous3, 
  WiMoonThirdQuarter, 
  WiMoonWaningCrescent3 
} from 'react-icons/wi';

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

  const getMoonIcon = (phase: number) => {
    if (phase < 0.03 || phase > 0.97) return WiMoonNew;
    if (phase < 0.22) return WiMoonWaxingCrescent3;
    if (phase < 0.28) return WiMoonFirstQuarter;
    if (phase < 0.47) return WiMoonWaxingGibbous3;
    if (phase < 0.53) return WiMoonFull;
    if (phase < 0.72) return WiMoonWaningGibbous3;
    if (phase < 0.78) return WiMoonThirdQuarter;
    return WiMoonWaningCrescent3;
  };

  const getMoonAge = (phase: number): number => {
    const lunarCycle = 29.53; // days
    return Math.round(phase * lunarCycle * 10) / 10;
  };

  const getNextMajorPhase = (currentPhase: number): { name: string; date: Date } => {
    const lunarCycle = 29.53;
    const now = new Date();
    
    // Major phases: New Moon (0), First Quarter (0.25), Full Moon (0.5), Last Quarter (0.75)
    const phases = [
      { value: 0, name: 'New Moon' },
      { value: 0.25, name: 'First Quarter' },
      { value: 0.5, name: 'Full Moon' },
      { value: 0.75, name: 'Last Quarter' },
      { value: 1, name: 'New Moon' }
    ];
    
    // Find next major phase
    let nextPhase = phases.find(p => p.value > currentPhase) || phases[0];
    
    // Calculate days until next phase
    let daysUntil;
    if (nextPhase.value > currentPhase) {
      daysUntil = (nextPhase.value - currentPhase) * lunarCycle;
    } else {
      daysUntil = (1 - currentPhase + nextPhase.value) * lunarCycle;
    }
    
    const nextDate = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
    
    return {
      name: nextPhase.name,
      date: nextDate
    };
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTimeRemaining = (targetDate: Date | null): { hours: number; minutes: number } | null => {
    if (!targetDate) return null;
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    
    if (diffMs < 0) return null; // Event has already passed
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  const calculateMoonData = (lat: number, lng: number): MoonData => {
    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Invalid coordinates');
    }
    
    const now = new Date();
    const moonPosition = SunCalc.getMoonPosition(now, lat, lng);
    const moonIllumination = SunCalc.getMoonIllumination(now);
    const moonTimes = SunCalc.getMoonTimes(now, lat, lng);

    // If moonrise/moonset has already passed today, get tomorrow's times
    let nextRise = moonTimes.rise;
    let nextSet = moonTimes.set;
    
    if (nextRise && nextRise.getTime() < now.getTime()) {
      // Get tomorrow's moonrise
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowTimes = SunCalc.getMoonTimes(tomorrow, lat, lng);
      nextRise = tomorrowTimes.rise;
    }
    
    if (nextSet && nextSet.getTime() < now.getTime()) {
      // Get tomorrow's moonset
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowTimes = SunCalc.getMoonTimes(tomorrow, lat, lng);
      nextSet = tomorrowTimes.set;
    }

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
      rise: nextRise,
      set: nextSet
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
          
          // Validate coordinates
          if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            reject(new Error('Invalid coordinates'));
            return;
          }
          
          try {
            // Try to get city name from reverse geocoding with encoded parameters
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`
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
          <DialogContent className="bg-card/95 backdrop-blur border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                Moon Phase Details
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-6 text-center">
              <div className="flex justify-center">
                {moonData && (() => {
                  const MoonIcon = getMoonIcon(moonData.phase);
                  return <MoonIcon className="w-32 h-32 text-muted-foreground" />;
                })()}
              </div>
              
              {moonData && (
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-semibold mb-1">
                      {getMoonPhaseDescription(moonData.phase)}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-muted-foreground">
                    <div>
                      <span className="font-medium">Illumination:</span>{' '}
                      {(moonData.illumination * 100).toFixed(1)}%
                    </div>
                    
                    <div>
                      <span className="font-medium">Age of Moon:</span>{' '}
                      {getMoonAge(moonData.phase)} days
                    </div>
                    
                    <div>
                      <span className="font-medium">Next phase: {getNextMajorPhase(moonData.phase).name}:</span>{' '}
                      {formatDate(getNextMajorPhase(moonData.phase).date)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openDialog === 'position'} onOpenChange={() => setOpenDialog(null)}>
          <DialogContent className="bg-card/95 backdrop-blur border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Compass className="w-5 h-5" />
                Position Details
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-6">
              {moonData && (() => {
                const size = 300;
                const centerX = size / 2;
                const centerY = size / 2;
                const maxRadius = (size / 2) - 40;
                
                // Convert altitude and azimuth to x, y coordinates
                const altitude = moonData.altitude;
                const azimuth = moonData.azimuth;
                
                // Calculate radius from center (0° altitude = edge, 90° altitude = center)
                // Use absolute value for negative altitudes to show position below horizon
                const radiusFromCenter = maxRadius * (1 - Math.abs(altitude) / 90);
                
                // Convert azimuth to radians (0° = North/top, clockwise)
                const angleInRadians = azimuth * (Math.PI / 180);
                
                // Calculate x, y position
                const moonX = centerX + radiusFromCenter * Math.sin(angleInRadians);
                const moonY = centerY - radiusFromCenter * Math.cos(angleInRadians);
                
                return (
                  <div className="flex flex-col items-center space-y-4">
                    <svg width={size} height={size} className="overflow-visible">
                      {/* Background circle */}
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r={maxRadius}
                        fill="hsl(var(--background))"
                        stroke="hsl(var(--border))"
                        strokeWidth="2"
                      />
                      
                      {/* Concentric circles for altitude levels (15°, 30°, 45°, 60°, 75°) */}
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r={maxRadius * 0.83}
                        fill="none"
                        stroke="hsl(var(--border))"
                        strokeWidth="1"
                        opacity="0.2"
                      />
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r={maxRadius * 0.67}
                        fill="none"
                        stroke="hsl(var(--border))"
                        strokeWidth="1"
                        opacity="0.3"
                      />
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r={maxRadius * 0.5}
                        fill="none"
                        stroke="hsl(var(--border))"
                        strokeWidth="1"
                        opacity="0.3"
                      />
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r={maxRadius * 0.33}
                        fill="none"
                        stroke="hsl(var(--border))"
                        strokeWidth="1"
                        opacity="0.3"
                      />
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r={maxRadius * 0.17}
                        fill="none"
                        stroke="hsl(var(--border))"
                        strokeWidth="1"
                        opacity="0.2"
                      />
                      
                      {/* Radial lines for cardinal and intercardinal directions */}
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                        const rad = angle * (Math.PI / 180);
                        const x2 = centerX + maxRadius * Math.sin(rad);
                        const y2 = centerY - maxRadius * Math.cos(rad);
                        return (
                          <line
                            key={angle}
                            x1={centerX}
                            y1={centerY}
                            x2={x2}
                            y2={y2}
                            stroke="hsl(var(--border))"
                            strokeWidth="1"
                            opacity="0.2"
                          />
                        );
                      })}
                      
                      {/* Compass direction labels */}
                      <text
                        x={centerX}
                        y={centerY - maxRadius - 15}
                        textAnchor="middle"
                        className="fill-foreground font-semibold text-lg"
                      >
                        N
                      </text>
                      <text
                        x={centerX + maxRadius + 15}
                        y={centerY + 5}
                        textAnchor="middle"
                        className="fill-foreground font-semibold text-lg"
                      >
                        E
                      </text>
                      <text
                        x={centerX}
                        y={centerY + maxRadius + 25}
                        textAnchor="middle"
                        className="fill-foreground font-semibold text-lg"
                      >
                        S
                      </text>
                      <text
                        x={centerX - maxRadius - 15}
                        y={centerY + 5}
                        textAnchor="middle"
                        className="fill-foreground font-semibold text-lg"
                      >
                        W
                      </text>
                      
                      {/* Moon position */}
                      {altitude >= 0 ? (
                        <>
                          {/* Moon glow effect */}
                          <circle
                            cx={moonX}
                            cy={moonY}
                            r="12"
                            fill="hsl(var(--primary))"
                            opacity="0.3"
                          />
                          {/* Moon dot */}
                          <circle
                            cx={moonX}
                            cy={moonY}
                            r="8"
                            fill="hsl(var(--primary))"
                          />
                        </>
                      ) : (
                        /* Moon below horizon - show dimmed at edge */
                        <circle
                          cx={moonX}
                          cy={moonY}
                          r="8"
                          fill="hsl(var(--muted-foreground))"
                          opacity="0.3"
                        />
                      )}
                      
                      {/* Center point (zenith) */}
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r="2"
                        fill="hsl(var(--muted-foreground))"
                        opacity="0.5"
                      />
                    </svg>
                    
                    {/* Position information */}
                    <div className="space-y-2 text-center text-muted-foreground">
                      <div>
                        <span className="font-medium">Altitude:</span>{' '}
                        {formatDegrees(moonData.altitude)}
                        {moonData.altitude >= 0 ? ' above horizon' : ' below horizon'}
                      </div>
                      <div>
                        <span className="font-medium">Azimuth:</span>{' '}
                        {formatDegrees(moonData.azimuth)} ({getAzimuthDirection(moonData.azimuth)})
                      </div>
                      {moonData.altitude < 0 && (
                        <div className="text-sm pt-2 text-amber-500">
                          Moon is currently below the horizon
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openDialog === 'rise'} onOpenChange={() => setOpenDialog(null)}>
          <DialogContent className="bg-card/95 backdrop-blur border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sunrise className="w-5 h-5" />
                Moonrise Details
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center space-y-6">
              {moonData && (() => {
                const timeRemaining = getTimeRemaining(moonData.rise);
                
                return (
                  <div className="space-y-4">
                    <div className="text-2xl font-semibold">
                      Next moonrise in:
                    </div>
                    {timeRemaining ? (
                      <div className="text-5xl font-bold font-doto text-primary">
                        {timeRemaining.hours}h : {String(timeRemaining.minutes).padStart(2, '0')}m
                      </div>
                    ) : (
                      <div className="text-lg text-muted-foreground">
                        No moonrise data available
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openDialog === 'set'} onOpenChange={() => setOpenDialog(null)}>
          <DialogContent className="bg-card/95 backdrop-blur border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sunset className="w-5 h-5" />
                Moonset Details
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center space-y-6">
              {moonData && (() => {
                const timeRemaining = getTimeRemaining(moonData.set);
                
                return (
                  <div className="space-y-4">
                    <div className="text-2xl font-semibold">
                      Next moonset in:
                    </div>
                    {timeRemaining ? (
                      <div className="text-5xl font-bold font-doto text-primary">
                        {timeRemaining.hours}h : {String(timeRemaining.minutes).padStart(2, '0')}m
                      </div>
                    ) : (
                      <div className="text-lg text-muted-foreground">
                        No moonset data available
                      </div>
                    )}
                  </div>
                );
              })()}
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
