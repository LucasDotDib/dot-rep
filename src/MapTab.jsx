import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useState } from 'react';

const STATUS_COLORS = { ok:'#22c55e', recente:'#f59e0b', atrasado:'#ef4444', nunca:'#444' };

function makeIcon(color) {
  return L.divIcon({
    className:'',
    html:`<div style="width:13px;height:13px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,0.5)"></div>`,
    iconSize:[13,13], iconAnchor:[6,6], popupAnchor:[0,-8],
  });
}

function LocateControl({ onLocate }) {
  const map = useMap();
  useMapEvents({ locationfound(e) { onLocate(e.latlng); } });
  return (
    <div
      onClick={() => map.locate({ setView:true, maxZoom:15 })}
      style={{
        position:'absolute', bottom:90, right:10, zIndex:1000,
        background:'#1a1a1a', border:'1px solid #3a3a3a', borderRadius:8,
        width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', fontSize:18, boxShadow:'0 2px 6px rgba(0,0,0,0.5)',
      }}
      title="Me localizar"
    >🎯</div>
  );
}

export default function MapTab({ stores, visitStatus }) {
  const [userPos, setUserPos] = useState(null);
  const pdvsGeo = stores.filter(s => s.lat && s.lng);
  const center = pdvsGeo.length > 0
    ? [pdvsGeo[0].lat, pdvsGeo[0].lng]
    : [-23.55052, -46.633308];

  return (
    <div style={{ position:'relative', height:'calc(100dvh - 130px)', minHeight:300 }}>
      {pdvsGeo.length === 0 && (
        <div style={{
          position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          zIndex:999, background:'#1a1a1a', padding:'1rem 1.25rem', borderRadius:12,
          color:'#777', fontSize:13, textAlign:'center', lineHeight:1.6, maxWidth:230,
          border:'1px solid #2e2e2e', pointerEvents:'none',
        }}>
          📍 Nenhum PDV com localização ainda.<br/>
          <span style={{ fontSize:11 }}>Coordenadas são geradas ao salvar com endereço.</span>
        </div>
      )}
      <MapContainer center={center} zoom={13} style={{ height:'100%', width:'100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />
        {pdvsGeo.map(s => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={makeIcon(STATUS_COLORS[visitStatus(s.visita)])}>
            <Popup>
              <div style={{ fontFamily:'system-ui', minWidth:150 }}>
                <div style={{ fontWeight:700, marginBottom:3 }}>{s.nome}</div>
                <div style={{ fontSize:12, color:'#666', marginBottom:4 }}>{s.end}</div>
                {s.contato_nome && <div style={{ fontSize:12 }}>👤 {s.contato_nome}</div>}
                {s.contato_tel && (
                  <a href={`tel:${s.contato_tel}`} style={{ fontSize:12, color:'#f5c800', display:'block', marginTop:2 }}>
                    📞 {s.contato_tel}
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        {userPos && (
          <Marker position={userPos} icon={makeIcon('#3b82f6')}>
            <Popup><span style={{ fontSize:12 }}>Você está aqui</span></Popup>
          </Marker>
        )}
        <LocateControl onLocate={setUserPos} />
      </MapContainer>
    </div>
  );
}
