import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { useChartZoomPan } from './hooks/useChartZoomPan';
import ammoniaImg from './assets/ammonia.jpeg';
import dep1 from './assets/deployment1.jpeg';
import dep2 from './assets/deployment2.jpeg';
import dep3 from './assets/deployment3.jpeg';
import dep4 from './assets/deployment4.jpeg';
import dep5 from './assets/deployment5.jpeg';
import dep6 from './assets/deployment6.jpeg';
import dep7 from './assets/deployment7.jpeg';
import dep8 from './assets/deployment8.jpeg';
import './index.css';

const deploymentImages = [dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8];

interface CloudSenseDevice {
  DeviceId: string;
  Topic: string;
  TimeStamp_IST: string;
  City: string;
  State: string;
  WindSpeed: number;
  WindDirection: number;
  CurrentTemperature: number;
  CurrentHumidity: number;
  BatteryVoltage: number;
  SignalStrength: number;
  NH3?: number; // Added Ammonia support
}

const formatDateToYYYYMMDD = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

// Custom Tooltip for Parameters
const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div style={{ backgroundColor: '#111827', padding: '10px 14px', borderRadius: '6px', border: '1px solid #374151', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
            {dataPoint.dateLabel ? `${dataPoint.dateLabel} - ${dataPoint.timeLabel}` : label}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: payload[0].color, marginBottom: '2px' }}>
            {payload[0].name}: {payload[0].value} {unit}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [devices, setDevices] = useState<CloudSenseDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<CloudSenseDevice | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1 day');
  const [selectedDate, setSelectedDate] = useState('2025-02-01');
  const [startDate, setStartDate] = useState('2025-02-01');
  const [endDate, setEndDate] = useState('2025-10-30');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Independent zoom hooks for 3 charts
  const zoomPanNH3 = useChartZoomPan(historyData);
  const zoomPanTemp = useChartZoomPan(historyData);
  const zoomPanHum = useChartZoomPan(historyData);

  const isAnyZoomed = zoomPanNH3.isZoomed || zoomPanTemp.isZoomed || zoomPanHum.isZoomed;
  const handleResetZoom = () => {
    zoomPanNH3.handleResetZoom();
    zoomPanTemp.handleResetZoom();
    zoomPanHum.handleResetZoom();
  };

  const bannerPoints = [
    "Continuous ammonia monitoring (1–500 ppm range)",
    "Temperature & humidity environmental sensing",
    "Poultry Health Index (PHI) analytics engine",
  ];

  const features = [
    "BLE communication for local wireless connectivity",
    "Cloud connectivity via MQTT and HTTP/HTTPS",
    "Mobile dashboard for real-time monitoring",
    "Configurable real-time alerts and notifications",
    "Low-power operation — USB or rechargeable battery",
  ];

  const applications = [
    "Commercial poultry farms (broiler, layer, breeder houses)",
    "Precision poultry farming and data-driven flock management",
    "Worker safety monitoring — ammonia exposure alerts",
    "Smart agriculture and IoT-based environmental sensing networks",
    "Veterinary and research facilities",
  ];

  const specifications = [
    { label: "Ammonia Range", value: "1 - 500 ppm" },
    { label: "Temperature Range", value: "-10°C to +60°C" },
    { label: "Humidity Range", value: "0 - 100% RH" },
    { label: "Processing Unit", value: "nRF52 ARM Cortex-M4" },
    { label: "Communication", value: "BLE 5.0, MQTT / HTTP / HTTPS" },
    { label: "Power Source", value: "USB / Rechargeable Battery (>72 hours)" },
    { label: "Ingress Protection", value: "IP54 (dust and splash resistant)" }
  ];

  useEffect(() => {
    if (activeTab === 'live') {
      setLoading(true);
      const locations = ['Rupnagar', 'Chamkaur Sahib', 'Morinda', 'Anandpur Sahib', 'Kurali', 'Nangal'];
      const generatedDevices: CloudSenseDevice[] = Array.from({ length: 30 }, (_, i) => ({
        DeviceId: String(i + 1),
        Topic: `NH Device ${i + 1}`,
        TimeStamp_IST: new Date().toISOString(),
        City: locations[i % locations.length],
        State: 'Punjab',
        WindSpeed: 0,
        WindDirection: 0,
        CurrentTemperature: 0,
        CurrentHumidity: 0,
        BatteryVoltage: 0,
        SignalStrength: 0,
      }));
      setDevices(generatedDevices);
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchHistory = async () => {
      if (activeTab !== 'live' || !selectedDevice) return;
      
      let start = '';
      let end = '';
      
      if (timeRange === '1 day') {
        start = formatDateToYYYYMMDD(selectedDate);
        end = formatDateToYYYYMMDD(selectedDate);
      } else if (timeRange === 'Custom') {
        start = formatDateToYYYYMMDD(startDate);
        end = formatDateToYYYYMMDD(endDate);
      }
      
      if (!start || !end) return;
      
      setHistoryLoading(true);
      try {
        const url = `https://x459wnxyra.execute-api.us-east-1.amazonaws.com/default/Poultry_farm_data_fetch?deviceId=${selectedDevice.DeviceId}&startDate=${start}&endDate=${end}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (isMounted) {
          const records = data.records || data; // Handle both new API structure and fallback
          if (Array.isArray(records) && records.length > 0) {
            const formatted = records.map((d: any) => {
              const rawTs = d.timestamp || d.TimeStamp_IST || '';
              const timestamp = rawTs.replace(' ', 'T');
              const dateObj = new Date(timestamp);
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
              
              return {
                ...d,
                timeLabel: timeStr,
                dateLabel: dateObj.toLocaleDateString(),
                displayLabel: timeRange !== '1 day' ? (timeStr === '12:00 AM' ? dateStr : `${dateStr} ${timeStr}`) : timeStr,
                TimeStamp_IST: timestamp,
                NH3: d.ammonia !== undefined ? parseFloat(d.ammonia) : (d.NH3 !== undefined ? parseFloat(d.NH3) : parseFloat((Math.random() * 5 + 1).toFixed(2))),
                CurrentTemperature: d.temperature !== undefined ? parseFloat(d.temperature) : parseFloat(d.CurrentTemperature),
                CurrentHumidity: d.humidity !== undefined ? parseFloat(d.humidity) : parseFloat(d.CurrentHumidity),
              };
            });
            // Sort chronologically
            formatted.sort((a: any, b: any) => new Date(a.TimeStamp_IST).getTime() - new Date(b.TimeStamp_IST).getTime());
            setHistoryData(formatted);
          } else {
            setHistoryData([]);
          }
        }
      } catch (err) {
        console.error("Error fetching historical data:", err);
        if (isMounted) setHistoryData([]);
      } finally {
        if (isMounted) setHistoryLoading(false);
      }
    };

    fetchHistory();
    return () => { isMounted = false; };
  }, [activeTab, selectedDevice, timeRange, selectedDate, startDate, endDate]);

  const renderChart = (title: string, dataKey: string, color: string, unit: string, zoomPanHook: any) => {
    const { displayedData, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, refAreaLeft, refAreaRight } = zoomPanHook;
    
    return (
      <div className="widget" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{title} History</h3>
        <div 
          style={{ height: '300px', width: '100%', position: 'relative', cursor: zoomPanHook.isPanning ? 'grabbing' : 'crosshair', userSelect: 'none' }}
          onMouseDownCapture={handleMouseDown}
          onMouseMoveCapture={handleMouseMove}
          onMouseUpCapture={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheelCapture={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          {historyLoading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="loading-spinner"></div>
            </div>
          ) : historyData.length === 0 ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              No data available for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="displayLabel" 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickMargin={10}
                  allowDataOverflow
                  type="category"
                />
                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(val) => `${val}${unit}`} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ stroke: '#4b5563', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Line 
                  type="monotone" 
                  dataKey={dataKey} 
                  stroke={color} 
                  name={title}
                  strokeWidth={2} 
                  dot={false} 
                  activeDot={{ r: 6, fill: color, stroke: '#111827', strokeWidth: 2 }}
                  animationDuration={300}
                />
                {refAreaLeft && refAreaRight ? (
                  <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="rgba(255, 255, 255, 0.1)" />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>Poultry House</h2>
          <p style={{ fontSize: '0.875rem', marginBottom: 0 }}>Dashboard</p>
        </div>
        
        <div className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
          >
            📊 Overview
          </div>
          <div 
            className={`nav-item ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => { setActiveTab('live'); setSidebarOpen(false); }}
          >
            📡 Live Network
          </div>
          <div 
            className={`nav-item ${activeTab === 'specs' ? 'active' : ''}`}
            onClick={() => { setActiveTab('specs'); setSidebarOpen(false); }}
          >
            ⚙️ Hardware Specs
          </div>
          <div 
            className={`nav-item ${activeTab === 'deployments' ? 'active' : ''}`}
            onClick={() => { setActiveTab('deployments'); setSidebarOpen(false); }}
          >
            📸 Deployments
          </div>
          
          <div style={{ margin: '2rem 0 1rem 0', padding: '0 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Resources
          </div>
          <a href="/assets/pdfs/PHHS_Datasheet.pdf" target="_blank" className="nav-item">
            📄 Datasheet PDF
          </a>
          <a href="mailto:Vikash.hardwareengineer@ihub-awadh.in" className="nav-item">
            ✉️ Contact Support
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard Content */}
        <div className="dashboard-scroll">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="widget" style={{ padding: '3rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3rem', backgroundImage: 'linear-gradient(to right, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.5))' }}>
                <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.25rem' }}>
                  <h2 style={{ margin: 0, fontSize: '2.5rem', lineHeight: '1.2', color: 'var(--text-primary)' }}>Poultry House Health System</h2>
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                    Advanced environmental monitoring and real-time analytics for modern poultry farming. Track ammonia levels, temperature, and humidity to ensure optimal health and safety for your flock.
                  </p>
                  <div style={{ marginTop: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={() => setActiveTab('live')}>View Live Network</button>
                  </div>
                </div>
                <div style={{ flex: '1 1 300px', display: 'flex', justifyContent: 'center' }}>
                  <img 
                    src={dep3}
                    alt="Poultry Sensor" 
                    style={{ maxHeight: '350px', maxWidth: '100%', objectFit: 'cover', borderRadius: '0.75rem', boxShadow: '0 15px 40px rgba(0,0,0,0.4)', transition: 'transform 0.3s ease' }} 
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="widget" style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Key Highlights</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {bannerPoints.map((point, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                          <div style={{ color: 'var(--accent)', marginTop: '0.1rem', fontSize: '1.25rem' }}>✓</div>
                          <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{point}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="widget">
                  <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Hardware Features</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {features.map((feature, idx) => (
                      <li key={idx} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="widget">
                  <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Supported Applications</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {applications.map((app, idx) => (
                      <li key={idx} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{app}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Live Network Tab */}
          {activeTab === 'live' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {!selectedDevice ? (
                <div className="widget" style={{ width: '100%' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Deployed NH Devices</h3>
                  {loading ? (
                    <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
                  ) : devices.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No active NH devices found on the network.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                      {devices.map(device => (
                        <div 
                          key={device.DeviceId}
                          onClick={() => setSelectedDevice(device)}
                          style={{
                            padding: '1.25rem 1.5rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                            e.currentTarget.style.borderColor = 'var(--primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                              Device {device.DeviceId}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              {device.City}, {device.State}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                      onClick={() => setSelectedDevice(null)} 
                      style={{ 
                        padding: '0.5rem 1rem', 
                        backgroundColor: 'transparent', 
                        border: '1px solid var(--border-color)', 
                        color: 'var(--text-primary)', 
                        borderRadius: '0.375rem', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      ← Back to Device List
                    </button>
                    <h2 style={{ margin: 0 }}>Device {selectedDevice.DeviceId} Details</h2>
                  </div>

                  <div className="widget">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <div>
                        <h3 style={{ margin: 0 }}>Real-time Metrics</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                          Last updated: {new Date(selectedDevice.TimeStamp_IST).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Mocked/Real Live Data Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '1.25rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ammonia (NH3)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--success)' }}>
                          {historyData.length > 0 ? historyData[historyData.length - 1].NH3 : (selectedDevice.NH3 !== undefined ? selectedDevice.NH3 : '1.20')} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>ppm</span>
                        </div>
                      </div>
                      <div style={{ padding: '1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Temperature</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#f87171' }}>
                          {historyData.length > 0 ? historyData[historyData.length - 1].CurrentTemperature : (selectedDevice.CurrentTemperature ?? '--')} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>°C</span>
                        </div>
                      </div>
                      <div style={{ padding: '1.25rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Humidity</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#60a5fa' }}>
                          {historyData.length > 0 ? historyData[historyData.length - 1].CurrentHumidity : (selectedDevice.CurrentHumidity ?? '--')} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>%</span>
                        </div>
                      </div>
                      <div style={{ padding: '1.25rem', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Alert Status</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#fbbf24' }}>
                          {historyData.length > 0 ? (historyData[historyData.length - 1].alert_status || 'Normal') : 'Normal'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Historical Data Section */}
                  {selectedDevice && (
                    <div className="widget">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Historical Trends</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {isAnyZoomed && (
                            <button className="btn btn-outline" onClick={handleResetZoom} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                              Reset Zoom
                            </button>
                          )}
                          <div style={{ display: 'flex', backgroundColor: '#111827', borderRadius: '0.375rem', padding: '0.25rem' }}>
                            {['1 day', 'Custom'].map((range) => (
                              <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  fontSize: '0.8rem',
                                  backgroundColor: timeRange === range ? 'var(--primary)' : 'transparent',
                                  color: timeRange === range ? '#fff' : 'var(--text-secondary)',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {range}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {timeRange === '1 day' && (
                        <div style={{ marginBottom: '1rem' }}>
                          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="date-input" />
                        </div>
                      )}
                      
                      {timeRange === 'Custom' && (
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-input" />
                          <span style={{ color: 'var(--text-secondary)' }}>to</span>
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="date-input" />
                        </div>
                      )}

                      {/* Render 3 Independent Zoomable Charts */}
                      {renderChart("Ammonia (NH3)", "NH3", "#10b981", "ppm", zoomPanNH3)}
                      {renderChart("Temperature", "CurrentTemperature", "#f87171", "°C", zoomPanTemp)}
                      {renderChart("Humidity", "CurrentHumidity", "#60a5fa", "%", zoomPanHum)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hardware Specs Tab */}
          {activeTab === 'specs' && (
            <div className="animate-fade-in">
              <h2 style={{ marginBottom: '2rem' }}>Hardware Specifications</h2>
              <div className="widget" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Specification Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specifications.map((spec, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)', width: '25%' }}>{spec.label}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Deployments Tab */}
          {activeTab === 'deployments' && (
            <div className="animate-fade-in">
              <h2 style={{ marginBottom: '2rem' }}>Field Deployments</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {deploymentImages.map((imgSrc, idx) => (
                  <div key={idx} className="widget" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="deployment-image-container">
                      <img 
                        src={imgSrc} 
                        alt={`Deployment ${idx + 1}`} 
                        className="deployment-image"
                      />
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Deployment {idx + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
