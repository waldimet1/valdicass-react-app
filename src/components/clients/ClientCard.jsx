import React from 'react';

const ClientCard = ({ client, onEdit, onDelete, onView, totalValue }) => {
  const tags = client.tags ? client.tags.split(',').map(t => t.trim()).filter(t => t) : [];
  
  // Get related data counts
  const quotes = JSON.parse(localStorage.getItem('landscaping_estimates') || '[]');
  const appointments = JSON.parse(localStorage.getItem('landscaping_appointments') || '[]');
  const clientQuotes = quotes.filter(q => q.clientId === client.id);
  const clientAppointments = appointments.filter(a => a.clientId === client.id);

  const handleCardClick = () => {
    onView(client);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(client);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(client.id);
  };

  const handleViewClick = (e) => {
    e.stopPropagation();
    onView(client);
  };

  return (
    <div className="client-card" onClick={handleCardClick}>
      <div className="client-header">
        <div className="client-name">{client.name}</div>
        <div className="client-type">
          {client.type.charAt(0).toUpperCase() + client.type.slice(1)} Client
        </div>
      </div>
      
      <div className="client-body">
        <div className="client-info">
          <div className="info-row">
            <span className="icon">📧</span>
            <span>{client.email}</span>
          </div>
          <div className="info-row">
            <span className="icon">📱</span>
            <span>{client.phone}</span>
          </div>
          {client.address && (
            <div className="info-row">
              <span className="icon">📍</span>
              <span>{client.address}</span>
            </div>
          )}
          {client.company && (
            <div className="info-row">
              <span className="icon">🏢</span>
              <span>{client.company}</span>
            </div>
          )}
        </div>

        {tags.length > 0 && (
          <div className="tags">
            {tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        )}

        <div className="client-stats">
          <div className="client-stat">
            <div className="client-stat-value">{clientQuotes.length}</div>
            <div className="client-stat-label">Estimates</div>
          </div>
          <div className="client-stat">
            <div className="client-stat-value">{clientAppointments.length}</div>
            <div className="client-stat-label">Appointments</div>
          </div>
          <div className="client-stat">
            <div className="client-stat-value">${totalValue.toFixed(0)}</div>
            <div className="client-stat-label">Total Value</div>
          </div>
        </div>

        <div className="client-actions">
          <button className="action-btn view" onClick={handleViewClick}>
            👁️ View
          </button>
          <button className="action-btn edit" onClick={handleEdit}>
            ✏️ Edit
          </button>
          <button className="action-btn delete" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientCard;