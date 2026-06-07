import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { useChartZoomPan } from './hooks/useChartZoomPan';
import ammoniaImg from './assets/ammonia.jpeg';
import './index.css';

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

const formatDateToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
};

// Custom Tooltip for Parameters
const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ backgroundColor: '#111827', padding: '10px 14px', borderRadius: '6px', border: '1px solid #374151', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>{label}</div>
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
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
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
      fetch('https://d1b09mxwt0ho4j.cloudfront.net/default/WS_Device_Activity')
        .then(res => res.json())
        .then(data => {
          if (data && data.devices) {
            const filtered = data.devices.filter((d: any) => 
              (d.DeviceId && d.DeviceId.startsWith('NH')) || (d.Topic && d.Topic.includes('NH'))
            );
            setDevices(filtered);
            if (filtered.length > 0) {
              setSelectedDevice(filtered[0]);
            }
          }
        })
        .catch(err => console.error("Error fetching CloudSense data:", err))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchHistory = async () => {
      if (activeTab !== 'live' || !selectedDevice) return;
      
      let start = '';
      let end = '';
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      if (timeRange === '1 day') {
        start = formatDateToDDMMYYYY(selectedDate);
        end = formatDateToDDMMYYYY(selectedDate);
      } else if (timeRange === '7 day') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        start = formatDateToDDMMYYYY(d.toISOString().split('T')[0]);
        end = formatDateToDDMMYYYY(todayStr);
      } else if (timeRange === 'Custom') {
        start = formatDateToDDMMYYYY(startDate);
        end = formatDateToDDMMYYYY(endDate);
      }
      
      if (!start || !end) return;
      
      setHistoryLoading(true);
      try {
        const url = `https://gtk47vexob.execute-api.us-east-1.amazonaws.com/ssmet0126data?deviceid=${selectedDevice.DeviceId}&start_date=${start}&end_date=${end}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (isMounted) {
          if (data && data.length > 0) {
            const formatted = data.map((d: any) => ({
              ...d,
              timeLabel: new Date(d.TimeStamp_IST).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              dateLabel: new Date(d.TimeStamp_IST).toLocaleDateString(),
              // Fallback to mock NH3 if not available in payload for testing
              NH3: d.NH3 !== undefined ? d.NH3 : (Math.random() * 5 + 1).toFixed(2),
            }));
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
    const { chartData, left, right, refAreaLeft, refAreaRight, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } = zoomPanHook;
    
    return (
      <div className="widget" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{title} History</h3>
        <div style={{ height: '300px', width: '100%', position: 'relative' }}>
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
              <LineChart 
                data={chartData} 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheelCapture={handleWheel}
                style={{ cursor: zoomPanHook.isPanning ? 'grabbing' : 'crosshair' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="timeLabel" 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickMargin={10}
                  allowDataOverflow
                  domain={[left, right]}
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
              <div className="widget" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', backgroundImage: 'linear-gradient(to right, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.5))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <h2 style={{ margin: 0 }}>Poultry House Health System</h2>
                </div>
                <img 
                  src={ammoniaImg}
                  alt="Poultry Sensor" 
                  style={{ maxHeight: '350px', width: 'auto', borderRadius: '0.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
                />
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
              
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div className="widget" style={{ flex: '1 1 250px' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Deployed NH Devices</h3>
                  {loading ? (
                    <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
                  ) : devices.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No active NH devices found on the network.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
                      {devices.map(device => (
                        <div 
                          key={device.DeviceId}
                          onClick={() => setSelectedDevice(device)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            backgroundColor: selectedDevice?.DeviceId === device.DeviceId ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                            border: `1px solid ${selectedDevice?.DeviceId === device.DeviceId ? 'var(--primary)' : 'var(--border-color)'}`,
                            transition: 'all 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 500, color: selectedDevice?.DeviceId === device.DeviceId ? 'var(--primary)' : 'var(--text-primary)' }}>
                              {device.DeviceId}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              {device.City}, {device.State}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
                            Active
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {selectedDevice ? (
                    <div className="widget">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                          <h2 style={{ margin: 0 }}>Device {selectedDevice.DeviceId}</h2>
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
                            {selectedDevice.NH3 !== undefined ? selectedDevice.NH3 : '1.20'} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>ppm</span>
                          </div>
                        </div>
                        <div style={{ padding: '1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Temperature</div>
                          <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#f87171' }}>
                            {selectedDevice.CurrentTemperature ?? '--'} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>°C</span>
                          </div>
                        </div>
                        <div style={{ padding: '1.25rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Humidity</div>
                          <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#60a5fa' }}>
                            {selectedDevice.CurrentHumidity ?? '--'} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="widget" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
                      Select a device from the list to view its real-time metrics.
                    </div>
                  )}

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
                            {['1 day', '7 day', 'Custom'].map((range) => (
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
              </div>
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

        </div>
      </main>
    </div>
  );
}
