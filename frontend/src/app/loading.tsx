export default function Loading() {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid #DCE1E8', borderTopColor: '#0BA5CC',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontSize: 13, color: '#B4B2A9' }}>Загрузка...</p>
      </div>
    </div>
  );
}
